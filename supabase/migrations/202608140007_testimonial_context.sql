-- Sprint 3.5: additive support for manual testimonial context.
alter table public.testimonials
  add column if not exists result_context text
  check (result_context is null or char_length(result_context) <= 500);

grant select, insert, update, delete on public.testimonials to authenticated;
revoke insert, update, delete on public.testimonials from anon;
