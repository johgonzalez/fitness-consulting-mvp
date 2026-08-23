-- Defense in depth: RLS denies anonymous writes, and SQL privileges must agree.
revoke insert, update, delete, truncate, references, trigger
on public.trainer_profiles, public.services, public.testimonials
from anon;

-- Authenticated users never need table-wide DDL-style privileges.
revoke truncate, references, trigger
on public.trainer_profiles, public.services, public.testimonials
from authenticated;
