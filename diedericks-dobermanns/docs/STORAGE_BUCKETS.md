# Storage buckets — Diedericks Dobermanns

All buckets are defined in Supabase migrations. Apply with `supabase db push` or run SQL in the dashboard.

| Bucket | Public | Purpose | Migration |
|--------|--------|---------|-----------|
| `dog-media` | Yes | Dog photos for public profiles | `0004_storage.sql` |
| `gallery` | Yes | Marketing gallery | `0004_storage.sql` |
| `testimonials` | Yes | Testimonial images | `0004_storage.sql` |
| `documents` | No | Client contracts & uploads (RLS by user id prefix) | `0004_storage.sql` |
| `avatars` | No | Profile avatars (RLS by user id prefix) | `0004_storage.sql` |
| `training-videos` | No | Training video files (admin upload, authenticated read) | `0031_storage_and_payments.sql` |
| `broadcasts` | No | Broadcast message attachments | `0031_storage_and_payments.sql` |

## Policies

- **Public buckets** (`dog-media`, `gallery`, `testimonials`): anyone can read; only admins can write.
- **Private buckets** (`documents`, `avatars`): users read/write objects under `{user_id}/…`; admins have full access.
- **`training-videos`**: admins upload; authenticated clients read (bundle access enforced in app logic).
- **`broadcasts`**: admins upload; authenticated users read.

## Manual verification

After deploying migrations 0031:

```sql
SELECT id, name, public FROM storage.buckets ORDER BY id;
```

Ensure all seven buckets exist. Create missing buckets via migration rather than the dashboard when possible.

## Signed URLs

Training videos and private documents should use Supabase signed URLs with short TTL when served to clients.
