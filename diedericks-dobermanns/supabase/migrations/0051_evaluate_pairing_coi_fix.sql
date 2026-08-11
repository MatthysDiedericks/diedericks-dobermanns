-- Fixes the COI leg of evaluate_pairing() (0050_evaluate_pairing.sql).
--
-- Bug: get_ancestors() only traverses dogs.father_id/mother_id, which is set on
-- 3 of 175 dogs. Every other pairing silently summed zero shared ancestors and
-- returned coi_estimate = 0.00%, which reads as "confirmed low COI" when it is
-- actually "we have no idea".
--
-- Real pedigree data (346 rows / 13 dogs / up to 4 generations, imported from
-- DogBreederPro) lives in pedigree_ancestors, keyed by registered_name rather
-- than dog_id — only 1 of 346 rows has own_ancestor_id linked back to an actual
-- dogs row. So ancestor identity for COI purposes has to be matched on
-- normalised registered_name, not uuid.
--
-- Fix:
--  1. Build each dog's ancestor set as the UNION of:
--       a) get_ancestors(dog_id, 4) resolved to a name via dogs.registered_name
--          (falls back to dogs.name) — covers any dog with father_id/mother_id
--          set, present and future.
--       b) pedigree_ancestors rows for that dog_id, using generation as depth
--          and registered_name directly — covers the DogBreederPro imports.
--     Names are normalised via lower(trim(...)) before matching, and each side
--     is DISTINCT on (name, depth) so a name available from both sources at
--     the same depth isn't double-counted.
--  2. Wright's sum (0.5^(n+m+1) per shared-name (n,m) depth pair) is unchanged
--     — same formula as before, just fed from the richer ancestor sets.
--  3. If EITHER dog has zero ancestor rows from both sources, we have no
--     pedigree data to compute a COI at all — return coi_estimate = NULL
--     instead of a fabricated 0.00%. A real 0% (both dogs have pedigree data
--     but share no ancestor) is still returned as 0. Callers must render NULL
--     as "COI not available", never as "0.00%".

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

  v_sire_has_ancestors boolean;
  v_dam_has_ancestors boolean;
  v_coi_raw double precision := 0;
  v_coi_pct numeric;
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

  -- 10: COI — Wright's coefficient via common ancestors, matched on normalised
  -- registered_name (not dog_id — see header note). Each side's ancestor set is
  -- the union of the id-chain (get_ancestors, resolved to a name) and the
  -- imported pedigree_ancestors rows for that dog, deduped on (name, depth).
  with sire_ancestors as (
    select distinct lower(trim(coalesce(d2.registered_name, d2.name))) as nm, ga.depth as depth
    from get_ancestors(p_sire_id, 4) ga
    join public.dogs d2 on d2.id = ga.ancestor_id
    where coalesce(d2.registered_name, d2.name) is not null
      and trim(coalesce(d2.registered_name, d2.name)) <> ''
    union
    select distinct lower(trim(pa.registered_name)) as nm, pa.generation as depth
    from public.pedigree_ancestors pa
    where pa.dog_id = p_sire_id
      and pa.registered_name is not null
      and trim(pa.registered_name) <> ''
  ),
  dam_ancestors as (
    select distinct lower(trim(coalesce(d2.registered_name, d2.name))) as nm, ga.depth as depth
    from get_ancestors(p_dam_id, 4) ga
    join public.dogs d2 on d2.id = ga.ancestor_id
    where coalesce(d2.registered_name, d2.name) is not null
      and trim(coalesce(d2.registered_name, d2.name)) <> ''
    union
    select distinct lower(trim(pa.registered_name)) as nm, pa.generation as depth
    from public.pedigree_ancestors pa
    where pa.dog_id = p_dam_id
      and pa.registered_name is not null
      and trim(pa.registered_name) <> ''
  )
  select
    exists (select 1 from sire_ancestors),
    exists (select 1 from dam_ancestors),
    coalesce(
      (select sum(power(0.5::double precision, (sa.depth + da.depth + 1)::double precision))
         from sire_ancestors sa
         join dam_ancestors da on da.nm = sa.nm),
      0
    )
    into v_sire_has_ancestors, v_dam_has_ancestors, v_coi_raw;

  if v_sire_has_ancestors and v_dam_has_ancestors then
    v_coi_pct := round((v_coi_raw * 10000)::numeric) / 100;
  else
    -- No pedigree data for one or both dogs — COI is unknown, not zero.
    v_coi_pct := null;
  end if;

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
  'Breeding-pairing legality + COI. Single source of truth for both the app and website — see PARITY PROMPT 4. coi_estimate is NULL when neither pedigree source has ancestor data for one or both dogs — never render NULL as 0%.';

-- Do NOT revoke EXECUTE from anon (revoking EXECUTE on a function referenced by an RLS
-- policy took the public site down for ~7 hours on 4 Aug). This function isn't used in
-- any RLS policy, but leave anon's default PUBLIC execute grant untouched regardless —
-- only add to authenticated.
grant execute on function public.evaluate_pairing(uuid, uuid) to authenticated;
