# Supabase operations checklist

Run after pulling latest migrations.

## Migrations to apply (if not yet on live)

| File | Purpose |
|------|---------|
| `0029_application_confirmation_notification.sql` | Application inbox + client confirmation notifications |
| `0030_trainer_rls.sql` | Trainer portal RLS for notes/uploads |
| `0031_storage_and_payments.sql` | `training-videos` + `broadcasts` buckets, `payment_orders` table |

```bash
cd diedericks-dobermanns
supabase db push
# or paste each migration into Supabase SQL editor
```

Verify:

```sql
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;
```

## Edge function secrets

```bash
supabase secrets set RESEND_API_KEY=re_xxxx
supabase secrets set PAYFAST_MERCHANT_ID=xxxx
supabase secrets set PAYFAST_MERCHANT_KEY=xxxx
supabase secrets set PAYFAST_PASSPHRASE=xxxx
supabase secrets set PAYFAST_SANDBOX=true
supabase secrets set SITE_URL=https://www.diedericksdobermanns.com
```

## Deploy functions

```bash
npm run deploy:functions
supabase functions deploy send-welcome-email
supabase functions deploy create-payfast-payment
supabase functions deploy payfast-itn
```

## PayFast ITN URL

Set in PayFast dashboard:

`https://<project-ref>.supabase.co/functions/v1/payfast-itn`

## Welcome email trigger (optional)

Invoke `send-welcome-email` from a Supabase Auth hook or database trigger on `auth.users` insert. Source is version-controlled at `supabase/functions/send-welcome-email/index.ts`.

## Security (pre-launch)

- [ ] Rotate service role key if ever exposed
- [ ] Confirm email verification enabled in Supabase Auth
- [ ] Enable PITR on production project
- [ ] Audit RLS on all public tables
