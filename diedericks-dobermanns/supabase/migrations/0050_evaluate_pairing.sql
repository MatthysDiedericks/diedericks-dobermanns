-- Single source of truth for breeding-pairing legality + COI. Both the app and
-- the website must call this function instead of re-implementing any of these
-- rules in TypeScript — see lib/breeding/evaluatePairing.ts (app) and
-- src/lib/breeding/evaluatePairing.ts (web).
--
-- Ported 1:1 from lib/breeding/rules.ts#checkPairingValidity and
-- lib/breeding/coi.ts#calculateCoi (see PARITY PROMPT 4). Rule order below
-- matches the TS early-return chain exactly, including which checks are
-- reachable — do not reorder without re-checking rules.ts.
--
-- Rules ported:
--  1. Father x Daughter (dam.father_id = sire.id)              -> prohibited
--  2. Mother x Son (sire.mother_id = dam.id)                    -> prohibited
--  3. Full siblings (same father_id AND same mother_id)         -> prohibited
--  4. Half-siblings, same sire (father_id match)                -> prohibited
--  5. Half-siblings, same dam (mother_id match)                 -> prohibited
--  6. Named hard-blocked pairs (kennel pedigree knowledge that predates
--     digitised records): Hunter x Hailey, Hunter x Cendra, Santini x Hannah,
--     Hunter x Cyrus, DC Son x Claire, DC Son x Kim -> prohibited.
--     Hunter x Hannah is an approved line-breeding EXCEPTION -> allowed, but
--     flagged with the exception note (matches rules.ts exactly, including
--     that a name match here short-circuits the checks below, same as TS).
--  7. DC Son x [dog sharing DC Son's own dam, i.e. Cleopatra]   -> prohibited
--  8. Odessa x Kim (either direction)                           -> prohibited
--  9. Cross-litter half-sibling-dam check: offspring of a Santini x Claire
--     litter must not cross with offspring of a Santini x Cendra litter
--     (or vice versa), since Claire and Cendra are half-siblings by Santini.
-- 10. COI: Wright's coefficient of inbreeding via common-ancestor path
--     summation (0.5^(n+m+1) per shared ancestor pair), using the existing
--     get_ancestors() pedigree traversal to depth 4. Numerically identical to
--     lib/breeding/coi.ts#calculateCoi.
--
-- Deliberately NOT ported (unchanged, TS-only, not "legality" questions):
--  - Health gate (DCM1-3/HD/ED) and age gate — these already only apply
--    inside the Pairing Builder screen's save button, not Planner's allocate
--    sheet; folding them into evaluate_pairing() would newly block Planner
--    allocations that are allowed today. Out of scope for a behaviour-
--    preserving port.
--  - isSaleOnlySire()/getBridgeSireBanner() — retention/UI-copy concerns, not
--    mating legality.
--
-- severity is intentionally a 3-value summary (not the app's 5-value
-- excellent/acceptable/caution/risk/high_risk COI display, which callers can
-- still derive locally from coi_estimate via lib/breeding/coi.ts):
--   'prohibited' - allowed = false (a hard rule fired)
--   'caution'    - allowed = true but coi_estimate > 6.25%, or an approved
--                  exception applies (matches COI_WARNING in constants.ts)
--   'ok'         - allowed = true, coi_estimate <= 6.25%, no exception note

create or replace function public.evaluate_pairing(p_sire_id uuid, p_dam_id uuid)
returns table (
  allowed boolean,
  severity text,
  coi_estimate double precision,
  reasons text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sire_name text;
  v_sire_father_id uuid;
  v_sire_mother_id uuid;
  v_dam_name text;
  v_dam_father_id uuid;
  v_dam_mother_id uuid;

  v_allowed boolean := true;
  v_reasons text[] := '{}';
  v_severity text;

  v_hard_seq int;
  v_hard_reason text;
  v_hard_is_exception boolean;
  v_hard_exception_note text;

  v_sire_origin_sire_name text;
  v_sire_origin_dam_name text;
  v_dam_origin_sire_name text;
  v_dam_origin_dam_name text;
  v_cross_claire_cendra boolean;

  v_coi_raw double precision := 0;
  v_coi_pct numeric := 0;
begin
  select name, father_id, mother_id
    into v_sire_name, v_sire_father_id, v_sire_mother_id
    from public.dogs where id = p_sire_id;

  select name, father_id, mother_id
    into v_dam_name, v_dam_father_id, v_dam_mother_id
    from public.dogs where id = p_dam_id;

  if v_sire_name is null or v_dam_name is null then
    return query select false, 'prohibited'::text, null::double precision,
      array['Sire or dam not found.']::text[];
    return;
  end if;

  -- 1-5: structural pedigree checks (rules.ts checkPairingValidity, top of function)
  if v_dam_father_id = p_sire_id then
    v_allowed := false;
    v_reasons := array['Father × Daughter — prohibited'];
  elsif v_sire_mother_id = p_dam_id then
    v_allowed := false;
    v_reasons := array['Mother × Son — prohibited'];
  elsif v_sire_father_id is not null and v_dam_father_id is not null
      and v_sire_mother_id is not null and v_dam_mother_id is not null
      and v_sire_father_id = v_dam_father_id and v_sire_mother_id = v_dam_mother_id then
    v_allowed := false;
    v_reasons := array['Full siblings — prohibited'];
  elsif v_sire_father_id is not null and v_sire_father_id = v_dam_father_id then
    v_allowed := false;
    v_reasons := array['Half-siblings (same sire) — prohibited'];
  elsif v_sire_mother_id is not null and v_sire_mother_id = v_dam_mother_id then
    v_allowed := false;
    v_reasons := array['Half-siblings (same dam) — prohibited'];
  else
    -- 6: named hard-blocked pairs — first match wins, same order as PROHIBITED_PAIRS
    select seq, reason, is_exception, exception_note
      into v_hard_seq, v_hard_reason, v_hard_is_exception, v_hard_exception_note
      from (
        values
          (1, 'Hunter', 'Hailey',
            $r$Father/daughter — Hunter is Hailey's sire (pedigree confirmed)$r$,
            false, null::text),
          (2, 'Hunter', 'Cendra',
            $r$Father/daughter — Hunter is Cendra's sire (pedigree confirmed)$r$,
            false, null::text),
          (3, 'Santini', 'Hannah',
            'Half-siblings — both sired by Napoleon Betelges',
            false, null::text),
          (4, 'Hunter', 'Hannah',
            $r$Uncle/niece — Havana Betelges is Hunter's full sister and Hannah's dam$r$,
            true,
            'Line-breeding exception approved 2026-07-21. Both dogs DCM-clear (PDK4/RBM20/TITIN). Pedigree COI not yet fully computed — monitor litter closely.'),
          (5, 'Hunter', 'Cyrus',
            $r$Father/daughter — Hunter is Cyrus Pup's sire (owner confirmed)$r$,
            false, null::text),
          (6, 'DC Son', 'Claire',
            $r$Half-siblings via Dharkha Betelges — D/C Son's sire is Dharkha; Claire's sire is Dharkha$r$,
            false, null::text),
          (7, 'DC Son', 'Kim',
            $r$Half-siblings via Dharkha Betelges — D/C Son's sire is Dharkha; Kim's sire is Dharkha$r$,
            false, null::text)
      ) as pairs(seq, frag_a, frag_b, reason, is_exception, exception_note)
      where (v_sire_name ilike '%' || frag_a || '%' and v_dam_name ilike '%' || frag_b || '%')
         or (v_sire_name ilike '%' || frag_b || '%' and v_dam_name ilike '%' || frag_a || '%')
      order by seq
      limit 1;

    if v_hard_seq is not null and not v_hard_is_exception then
      v_allowed := false;
      v_reasons := array[v_hard_reason];
    elsif v_hard_seq is not null and v_hard_is_exception then
      v_allowed := true;
      v_reasons := array['Approved line-breeding exception — ' || v_hard_reason || '. ' || coalesce(v_hard_exception_note, '')];
    elsif (v_sire_name ilike '%dc son%' or v_sire_name ilike '%d/c son%')
        and v_dam_mother_id is not null and v_sire_mother_id is not null
        and v_dam_mother_id = v_sire_mother_id then
      -- 7: DC Son x dog sharing DC Son's own dam (Cleopatra)
      v_allowed := false;
      v_reasons := array[$r$Half-siblings via Cleopatra — D/C Son's dam is Cleopatra; this dog's dam is also Cleopatra$r$];
    elsif (v_sire_name ilike '%Odessa%' and v_dam_name ilike '%Kim%')
       or (v_dam_name ilike '%Odessa%' and v_sire_name ilike '%Kim%') then
      -- 8: Odessa x Kim
      v_allowed := false;
      v_reasons := array[$r$Half-siblings via Odessa — Kim's dam is Raconti Odessa. Odessa offspring and Kim offspring cannot breed.$r$];
    else
      -- 9: cross-litter half-sibling-dam check (Santini x Claire / Santini x Cendra origins)
      select sd.name, dd.name
        into v_sire_origin_sire_name, v_sire_origin_dam_name
        from public.dogs origin_dog
        join public.pairings p on p.id = origin_dog.origin_pairing_id
        join public.dogs sd on sd.id = p.sire_id
        join public.dogs dd on dd.id = p.dam_id
       where origin_dog.id = p_sire_id;

      select sd.name, dd.name
        into v_dam_origin_sire_name, v_dam_origin_dam_name
        from public.dogs origin_dog
        join public.pairings p on p.id = origin_dog.origin_pairing_id
        join public.dogs sd on sd.id = p.sire_id
        join public.dogs dd on dd.id = p.dam_id
       where origin_dog.id = p_dam_id;

      v_cross_claire_cendra :=
        (v_sire_origin_sire_name ilike '%Santini%' and v_sire_origin_dam_name ilike '%Claire%'
           and v_dam_origin_sire_name ilike '%Santini%' and v_dam_origin_dam_name ilike '%Cendra%')
        or
        (v_sire_origin_sire_name ilike '%Santini%' and v_sire_origin_dam_name ilike '%Cendra%'
           and v_dam_origin_sire_name ilike '%Santini%' and v_dam_origin_dam_name ilike '%Claire%');

      if v_cross_claire_cendra then
        v_allowed := false;
        v_reasons := array['Pups from Santini × Claire and Santini × Cendra share the same sire and half-sibling dams — do not cross'];
      end if;
    end if;
  end if;

  -- 10: COI — Wright's coefficient via common ancestors (lib/breeding/coi.ts#calculateCoi).
  -- get_ancestors() enumerates every (ancestor_id, depth) pair per dog up to depth 4;
  -- joining sire's and dam's ancestor sets on ancestor_id naturally enumerates every
  -- (sire_depth, dam_depth) pair per shared ancestor, matching the nested-loop sum in TS.
  select coalesce(sum(power(0.5::double precision, (sa.depth + da.depth + 1)::double precision)), 0)
    into v_coi_raw
    from get_ancestors(p_sire_id, 4) sa
    join get_ancestors(p_dam_id, 4) da on da.ancestor_id = sa.ancestor_id;

  v_coi_pct := round((v_coi_raw * 10000)::numeric) / 100;

  if v_allowed then
    if v_coi_pct > 6.25 then
      v_reasons := v_reasons || (
        case when v_coi_pct > 12.5
          then 'COI ' || v_coi_pct::text || '% exceeds the 12.5% high-risk threshold — do not proceed without veterinary genetics review'
          else 'COI ' || v_coi_pct::text || '% exceeds the 6.25% caution threshold — consider a cross pairing with the opposite line'
        end
      );
      v_severity := 'caution';
    elsif array_length(v_reasons, 1) is not null then
      v_severity := 'caution';
    else
      v_severity := 'ok';
    end if;
  else
    v_severity := 'prohibited';
  end if;

  return query select v_allowed, v_severity, v_coi_pct::double precision, v_reasons;
end;
$$;

comment on function public.evaluate_pairing(uuid, uuid) is
  'Breeding-pairing legality + COI. Single source of truth for both the app and website — see PARITY PROMPT 4.';

-- Do NOT revoke EXECUTE from anon (revoking EXECUTE on a function referenced by an RLS
-- policy took the public site down for ~7 hours on 4 Aug). This function isn't used in
-- any RLS policy, but leave anon's default PUBLIC execute grant untouched regardless —
-- only add to authenticated.
grant execute on function public.evaluate_pairing(uuid, uuid) to authenticated;
