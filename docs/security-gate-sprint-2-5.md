# Security Gate — Sprint 2.5

Status em 14/08/2026: **APROVADO COM RISCO ACEITO**.

## Resultado

- migrations `202608140001` a `202608140004` aplicadas no projeto hospedado;
- RLS habilitado e policies verificadas em `trainer_profiles`, `services` e `testimonials`;
- isolamento entre Trainer A e Trainer B aprovado para leitura e escrita;
- `anonymous` sem escrita, sem acesso a perfil não publicado e sem acesso a `user_id`;
- perfil publicado acessível publicamente e slug inexistente retornando 404;
- confirmação de e-mail, login, onboarding, dashboard e preview validados;
- onboarding persistido no PostgreSQL;
- TypeScript, ESLint e production build aprovados.

## Risco aceito: proteção contra senhas vazadas

O advisor do Supabase reporta `auth_leaked_password_protection` porque **Leaked Password Protection** não está disponível no plano Free. A restrição é do plano contratado, não uma falha de RLS ou da aplicação.

Mitigações atuais:

- confirmação de e-mail permanece habilitada;
- requisitos de senha continuam aplicados no cadastro;
- credenciais privilegiadas não são usadas pelo frontend;
- Auth e autorização multi-tenant continuam protegidos pelo Supabase Auth e RLS.

Melhoria pendente: ao migrar o projeto para Supabase Pro ou superior, habilitar **Authentication → Attack Protection / Password Security → Leaked Password Protection** e executar novamente o database security advisor.

Critério de encerramento da melhoria: o advisor não deve mais retornar `auth_leaked_password_protection`.

## Alertas intencionais

As RPCs públicas `create_trainer_profile` e `get_my_trainer_profile` são `SECURITY DEFINER` e executáveis somente por usuários autenticados. Isso é intencional: ambas derivam a identidade de `auth.uid()`, usam `search_path` vazio e não aceitam um `user_id` fornecido pelo cliente. O helper interno de ownership foi movido para schema não exposto.
