-- 0075 — Personal cycle-length forecast from a female's own heat history.

alter table public.heat_cycles
  add column if not exists whelp_date_basis text
    check (whelp_date_basis is null or whelp_date_basis in
      ('ovulation','last_mating','heat_start','manual')),
  add column if not exists whelp_date_locked boolean not null default false,
  add column if not exists forecast_offset_days integer,
  add column if not exists forecast_basis text,
  add column if not exists forecast_range_earliest date,
  add column if not exists forecast_range_latest date;

comment on column public.heat_cycles.whelp_date_basis is
  'Evidence behind expected_whelp_date. manual = typed by hand; trigger will not overwrite.';
comment on column public.heat_cycles.forecast_offset_days is
  'Actual start minus the predicted start this row replaced. Negative = earlier than forecast.';

update public.heat_cycles hc
   set ovulation_date = null
 where hc.ovulation_date is not null
   and hc.ovulation_date = hc.heat_start_date + coalesce((
         select ovulation_offset_from_heat_start_days
           from public.breed_heat_defaults
          where breed ilike '%dober%'
          limit 1
       ), 11)
   and not exists (
         select 1 from public.progesterone_tests pt
          where pt.heat_cycle_id = hc.id
       );

create or replace function public.dog_cycle_forecast(p_dog_id uuid)
returns table (
  last_start date,
  length_days integer,
  min_days integer,
  max_days integer,
  basis text
)
language plpgsql
stable
set search_path = public
as $$
declare
  v_avg int := 180; v_min int := 150; v_max int := 210;
  v_starts date[]; v_gaps int[]; v_n int; v_last date;
  v_len int; v_lo int; v_hi int; v_basis text; i int;
begin
  select avg_cycle_length_days, min_cycle_length_days, max_cycle_length_days
    into v_avg, v_min, v_max
    from public.breed_heat_defaults
   where breed ilike '%dober%' limit 1;
  v_avg := coalesce(v_avg, 180);
  v_min := coalesce(v_min, 150);
  v_max := coalesce(v_max, 210);

  select array_agg(heat_start_date order by heat_start_date) into v_starts
    from public.heat_cycles
   where dog_id = p_dog_id and coalesce(is_predicted, false) = false;
  v_n := coalesce(array_length(v_starts, 1), 0);
  if v_n = 0 then return; end if;
  v_last := v_starts[v_n];

  if v_n = 1 then
    last_start := v_last; length_days := v_avg; min_days := v_min;
    max_days := v_max; basis := 'breed average — no history yet';
    return next; return;
  end if;

  v_gaps := array[]::int[];
  for i in 2..v_n loop
    v_gaps := v_gaps || (v_starts[i] - v_starts[i - 1]);
  end loop;

  if array_length(v_gaps, 1) = 1 then
    v_len := v_gaps[1]; v_lo := v_min; v_hi := v_max;
    v_basis := 'based on 1 previous cycle';
  else
    v_gaps := v_gaps[greatest(1, array_length(v_gaps, 1) - 2):array_length(v_gaps, 1)];
    v_len := 0;
    for i in 1..array_length(v_gaps, 1) loop v_len := v_len + v_gaps[i]; end loop;
    v_len := round(v_len::numeric / array_length(v_gaps, 1))::int;
    v_lo := v_gaps[1]; v_hi := v_gaps[1];
    for i in 2..array_length(v_gaps, 1) loop
      if v_gaps[i] < v_lo then v_lo := v_gaps[i]; end if;
      if v_gaps[i] > v_hi then v_hi := v_gaps[i]; end if;
    end loop;
    v_basis := format('based on her last %s cycles (avg %s days)',
                      array_length(v_gaps, 1), v_len);
  end if;

  last_start := v_last; length_days := v_len; min_days := v_lo;
  max_days := v_hi; basis := v_basis;
  return next;
end;
$$;

create or replace function public.refresh_dog_heat_forecast(p_dog_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  f record; d record; v_next date; v_lo date; v_hi date;
  v_pred uuid; v_last_id uuid;
begin
  if current_setting('app.refreshing_heat_forecast', true) = '1' then return; end if;
  perform set_config('app.refreshing_heat_forecast', '1', true);

  update public.heat_cycles hc
     set actual_cycle_length_days = o.gap
    from (
      select id,
             (heat_start_date - lag(heat_start_date) over (order by heat_start_date))::int as gap
        from public.heat_cycles
       where dog_id = p_dog_id and coalesce(is_predicted, false) = false
    ) o
   where hc.id = o.id and hc.actual_cycle_length_days is distinct from o.gap;

  select * into f from public.dog_cycle_forecast(p_dog_id);
  if f.last_start is null then return; end if;
  v_next := f.last_start + f.length_days;
  v_lo := f.last_start + f.min_days;
  v_hi := f.last_start + f.max_days;

  select avg_proestrus_days, avg_estrus_days, ovulation_offset_from_heat_start_days,
         avg_gestation_days
    into d from public.breed_heat_defaults
   where breed ilike '%dober%' limit 1;

  select id into v_last_id from public.heat_cycles
   where dog_id = p_dog_id and coalesce(is_predicted, false) = false
   order by heat_start_date desc limit 1;
  update public.heat_cycles set predicted_next_heat_date = v_next
   where id = v_last_id and predicted_next_heat_date is distinct from v_next;

  select id into v_pred from public.heat_cycles
   where dog_id = p_dog_id and is_predicted = true
   order by abs(heat_start_date - v_next) limit 1;

  if v_pred is not null then
    update public.heat_cycles set
      heat_start_date = v_next, proestrus_start_date = v_next,
      estrus_start_date = v_next + coalesce(d.avg_proestrus_days, 9),
      ovulation_date = v_next + coalesce(d.ovulation_offset_from_heat_start_days, 11),
      expected_whelp_date = v_next
        + coalesce(d.ovulation_offset_from_heat_start_days, 11)
        + coalesce(d.avg_gestation_days, 63),
      forecast_basis = f.basis, forecast_range_earliest = v_lo,
      forecast_range_latest = v_hi, status = 'predicted', updated_at = now()
    where id = v_pred;
  else
    insert into public.heat_cycles (
      dog_id, heat_start_date, proestrus_start_date, estrus_start_date,
      ovulation_date, expected_whelp_date, is_predicted, status,
      forecast_basis, forecast_range_earliest, forecast_range_latest
    ) values (
      p_dog_id, v_next, v_next, v_next + coalesce(d.avg_proestrus_days, 9),
      v_next + coalesce(d.ovulation_offset_from_heat_start_days, 11),
      v_next + coalesce(d.ovulation_offset_from_heat_start_days, 11)
        + coalesce(d.avg_gestation_days, 63),
      true, 'predicted', f.basis, v_lo, v_hi
    );
  end if;
end;
$$;
