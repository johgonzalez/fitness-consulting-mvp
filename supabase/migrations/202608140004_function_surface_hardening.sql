-- Keep helper functions used only by RLS outside the exposed public API schema.
create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.owns_trainer(p_trainer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trainer_profiles profile
    where profile.id = p_trainer_id
      and profile.user_id = (select auth.uid())
  );
$$;

revoke all on function private.owns_trainer(uuid) from public, anon;
grant execute on function private.owns_trainer(uuid) to authenticated;

alter policy "owners read own services" on public.services
using ((select private.owns_trainer(trainer_id)));

alter policy "owners insert own services" on public.services
with check ((select private.owns_trainer(trainer_id)));

alter policy "owners update own services" on public.services
using ((select private.owns_trainer(trainer_id)))
with check ((select private.owns_trainer(trainer_id)));

alter policy "owners delete own services" on public.services
using ((select private.owns_trainer(trainer_id)));

alter policy "owners read own testimonials" on public.testimonials
using ((select private.owns_trainer(trainer_id)));

alter policy "owners insert own testimonials" on public.testimonials
with check ((select private.owns_trainer(trainer_id)));

alter policy "owners update own testimonials" on public.testimonials
using ((select private.owns_trainer(trainer_id)))
with check ((select private.owns_trainer(trainer_id)));

alter policy "owners delete own testimonials" on public.testimonials
using ((select private.owns_trainer(trainer_id)));

drop function public.owns_trainer(uuid);

-- Event triggers are invoked by PostgreSQL itself and must not be callable by API roles.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
