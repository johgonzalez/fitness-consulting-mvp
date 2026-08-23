# Limites de acesso

- Visitantes leem somente perfis publicados, serviços ativos desses perfis e depoimentos publicados.
- O proprietário autenticado gerencia apenas entidades ligadas ao seu próprio `user_id`.
- Toda entidade dependente carrega `trainer_id`; a autorização é verificada no PostgreSQL, não apenas na interface.
- O Sprint 2 não usa nem configura `service_role`.
- Antes da produção, aplicar a migration em um projeto de teste e executar casos de isolamento entre dois usuários.
- RLS restringe linhas; privilégios por coluna impedem leitura pública de `user_id`.
- O onboarding e a projeção privada são RPCs com identidade derivada de `auth.uid()`.
- O teste reproduzível está em `supabase/tests/rls_isolation.sql` e deve rodar somente em ambiente isolado.
