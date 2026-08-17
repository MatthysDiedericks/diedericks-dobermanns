-- 0076 — Whelp-date precedence, supersede predicted cycles within ±45 days.

create or replace function public.auto_calculate_heat_dates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offset int := 11; v_gest int := 63; v_last_mating date;
  v_ov_real boolean := false; v_pred_id uuid; v_pred_start date;
begin
  if current_setting('app.refreshing_heat_forecast', true) = '1' then
    return new;
  end if;

  select ovulation_offset_from_heat_start_days, avg_gestation_days
    into v_offset, v_gest from public.breed_heat_defaults
   where breed ilike '%dober%' limit 1;
  v_offset := coalesce(v_offset, 11);
  v_gest := coalesce(v_gest, 63);

  if tg_op = 'INSERT' and coalesce(new.is_predicted, false) = false then
    select id, heat_start_date into v_pred_id, v_pred_start
      from public.heat_cycles
     where dog_id = new.dog_id and is_predicted = true
       and abs(heat_start_date - new.heat_start_date) <= 45
     order by abs(heat_start_date - new.heat_start_date) limit 1;
    if found then
      update public.heat_cycles set
        heat_start_date = new.heat_start_date,
        heat_end_date = coalesce(new.heat_end_date, heat_end_date),
        notes = coalesce(new.notes, notes),
        is_predicted = false,
        status = coalesce(nullif(new.status, 'predicted'), 'in_heat'),
        cycle_confirmed_at = coalesce(new.cycle_confirmed_at, now()),
        forecast_offset_days = (new.heat_start_date - v_pred_start),
        mating_date = coalesce(new.mating_date, mating_date),
        ovulation_date = new.ovulation_date,
        proestrus_start_date = coalesce(new.proestrus_start_date, new.heat_start_date),
        updated_at = now()
      where id = v_pred_id;
      return null;
    end if;
  end if;

  if tg_op = 'UPDATE' and coalesce(old.is_predicted, false)
     and coalesce(new.is_predicted, false) = false then
    new.cycle_confirmed_at := coalesce(new.cycle_confirmed_at, now());
    new.forecast_offset_days := coalesce(
      new.forecast_offset_days, (new.heat_start_date - old.heat_start_date));
    if new.ovulation_date is not null
       and new.ovulation_date = old.heat_start_date + v_offset then
      new.ovulation_date := null;
    end if;
  end if;

  if coalesce(new.is_predicted, false) = false then
    select heat_start_date into v_pred_start from public.heat_cycles
     where dog_id = new.dog_id and coalesce(is_predicted, false) = false
       and id is distinct from new.id and heat_start_date < new.heat_start_date
     order by heat_start_date desc limit 1;
    if found then
      new.actual_cycle_length_days := new.heat_start_date - v_pred_start;
    end if;
  end if;

  select (m.mated_at at time zone 'UTC')::date into v_last_mating
    from public.matings m where m.heat_cycle_id = new.id
   order by m.mated_at desc limit 1;
  v_last_mating := coalesce(v_last_mating, new.mating_date);

  v_ov_real := new.ovulation_date is not null and (
    exists (select 1 from public.progesterone_tests pt where pt.heat_cycle_id = new.id)
    or new.ovulation_date is distinct from (new.heat_start_date + v_offset)
  );

  if new.whelp_date_locked or new.whelp_date_basis = 'manual' then
    null;
  elsif v_ov_real then
    new.expected_whelp_date := new.ovulation_date + 63;
    new.whelp_date_earliest := new.ovulation_date + 60;
    new.whelp_date_latest := new.ovulation_date + 66;
    new.whelp_date_basis := 'ovulation';
  elsif v_last_mating is not null then
    new.expected_whelp_date := v_last_mating + 63;
    new.whelp_date_earliest := v_last_mating + 57;
    new.whelp_date_latest := v_last_mating + 65;
    new.whelp_date_basis := 'last_mating';
  elsif new.heat_start_date is not null then
    new.expected_whelp_date := new.heat_start_date + v_offset + v_gest;
    new.whelp_date_earliest := new.expected_whelp_date - 4;
    new.whelp_date_latest := new.expected_whelp_date + 4;
    new.whelp_date_basis := 'heat_start';
  end if;

  if new.expected_whelp_date is not null then
    new.go_home_earliest := new.expected_whelp_date + 56;
    new.go_home_latest := new.expected_whelp_date + 70;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auto_calculate_heat_dates on public.heat_cycles;
create trigger trg_auto_calculate_heat_dates
  before insert or update of heat_start_date, ovulation_date, mating_date,
    is_predicted, expected_whelp_date, whelp_date_locked
  on public.heat_cycles
  for each row execute function public.auto_calculate_heat_dates();

create or replace function public.trg_refresh_heat_forecast()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.is_predicted, false) then return new; end if;
  perform public.refresh_dog_heat_forecast(new.dog_id);
  return new;
end;
$$;

drop trigger if exists trg_refresh_heat_forecast on public.heat_cycles;
create trigger trg_refresh_heat_forecast
  after insert or update of heat_start_date, is_predicted
  on public.heat_cycles
  for each row execute function public.trg_refresh_heat_forecast();

update public.heat_cycles
   set heat_start_date = heat_start_date
 where coalesce(is_predicted, false) = false
   and coalesce(whelp_date_locked, false) = false;
