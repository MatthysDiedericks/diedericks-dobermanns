-- ============================================================================
-- Quote accept / decline must go through SECURITY DEFINER RPCs.
--
-- Migration 0053 added a client UPDATE policy on quotes. That is too broad:
-- a client who can UPDATE their own row can also rewrite totals, status
-- transitions, or other columns the policy's WITH CHECK does not fully pin.
-- Acceptance is a business event — it belongs in a narrow RPC, the same way
-- convert_quote_to_invoice does.
-- ============================================================================

drop policy if exists "Client can accept or decline own quote" on public.quotes;

-- True when the caller owns the quote via client_id or via the linked application.
create or replace function public.client_owns_quote(p_quote_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quotes q
    left join public.applications a on a.id = q.application_id
    where q.id = p_quote_id
      and auth.uid() is not null
      and (
        q.client_id = auth.uid()
        or a.user_id = auth.uid()
      )
  );
$$;

revoke all on function public.client_owns_quote(uuid) from public;
grant execute on function public.client_owns_quote(uuid) to authenticated;

create or replace function public.accept_quote(p_quote_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.quotes;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_quote from public.quotes where id = p_quote_id for update;
  if v_quote.id is null then
    raise exception 'Quote not found';
  end if;

  if not public.client_owns_quote(p_quote_id) then
    raise exception 'Not authorised to accept this quote';
  end if;

  if v_quote.status <> 'sent' then
    raise exception 'Only a sent quote can be accepted';
  end if;

  if v_quote.valid_until is not null and v_quote.valid_until < current_date then
    raise exception 'This quote has expired';
  end if;

  update public.quotes
  set
    status = 'accepted',
    accepted_by = auth.uid(),
    accepted_at = now(),
    client_id = coalesce(client_id, auth.uid()),
    updated_at = now()
  where id = p_quote_id;
end;
$$;

revoke all on function public.accept_quote(uuid) from public;
grant execute on function public.accept_quote(uuid) to authenticated;

create or replace function public.decline_quote(p_quote_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.quotes;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_quote from public.quotes where id = p_quote_id for update;
  if v_quote.id is null then
    raise exception 'Quote not found';
  end if;

  if not public.client_owns_quote(p_quote_id) then
    raise exception 'Not authorised to decline this quote';
  end if;

  if v_quote.status <> 'sent' then
    raise exception 'Only a sent quote can be declined';
  end if;

  update public.quotes
  set
    status = 'declined',
    declined_reason = nullif(trim(coalesce(p_reason, '')), ''),
    client_id = coalesce(client_id, auth.uid()),
    updated_at = now()
  where id = p_quote_id;
end;
$$;

revoke all on function public.decline_quote(uuid, text) from public;
grant execute on function public.decline_quote(uuid, text) to authenticated;
