-- Clear auto-set covers on puppies we bred. The first photo ever uploaded was
-- silently flagged is_primary; nobody chose it, so cards were stuck on the
-- youngest shot. sold and in_training fall through to "newest photo".
--
-- Do not touch keep / stud / retired — those covers stay so stud and brood
-- cards do not lose their hero with nothing chosen to replace it.

update public.dog_media m
   set is_primary = false
  from public.dogs d
 where d.id = m.dog_id
   and d.status in ('sold', 'in_training')
   and m.is_primary;
