-- Template Foundation V1A: make the existing application template identifier
-- reproducible in PostgreSQL. Keep this migration separate because a new enum
-- value cannot be referenced safely until the transaction that adds it commits.
alter type public.template_id add value if not exists 'template_03';
