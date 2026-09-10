# Confirmação de cadastro por código no sandbox

O cadastro da Cheipi usa `signUp` e `resend({ type: "signup" })`, seguidos de `verifyOtp({ email, token, type: "email" })`. Ambos os envios usam o template **Confirm sign up** do Supabase. O template de magic link não controla esses e-mails.

## Contrato da interface

- `SIGNUP_OTP_LENGTH` em `src/lib/auth/ui-config.ts`: 8.
- Configuração Auth hospedada `mailer_otp_length`: 8.
- Confirmação de e-mail obrigatória: `mailer_autoconfirm = false`.
- Validade do OTP: 3.600 segundos; intervalo de reenvio: 60 segundos.
- Limite de envio configurado no sandbox: 30 e-mails por hora.
- `mailer_templates_confirmation_content`: conteúdo de `supabase/templates/confirmation.html`, que exibe `{{ .Token }}`.
- `mailer_subjects_confirmation`: `Seu código de confirmação — Cheipi`.

O template apresenta somente o código de uso único. Não inclui um link de confirmação que possa ser consumido por scanners de e-mail antes de o usuário digitar o código.

## Estado confirmado em 08/09/2026

**Cadastro real, entrega de e-mail, reenvio e confirmação na UI: aprovados no Preview.** O provedor padrão do Supabase Free inicialmente recusou a personalização do template com HTTP 400. Após login autorizado do usuário no Resend, foi preparada uma credencial própria de envio para o sandbox e a configuração foi aplicada com HTTP 200.

| Item | Configuração confirmada |
| --- | --- |
| Projeto Supabase alterado | `smqkpqpixnglkflhwxhr`, exclusivamente sandbox |
| Credencial Resend | Chave nova de `sending_access`, limitada a `auth.cheipi.com` |
| Remetente | `no-reply-test@auth.cheipi.com` |
| Nome do remetente | Cheipi — Testes |
| Template/assunto | HTML versionado em `supabase/templates/confirmation.html`; assunto “Seu código de confirmação — Cheipi” |
| Conteúdo entregue | Português, OTP de oito dígitos, sem link de confirmação |
| Confirmação e limites | Confirmação obrigatória, validade 3.600 s, reenvio 60 s, 30 e-mails/h |

O PATCH ajustou SMTP, conteúdo, assunto e limite de envio somente no projeto sandbox. A releitura confirmou os valores, a SiteURL preservada e os redirects existentes de billing/Preview. O fingerprint Auth de produção permaneceu idêntico. As chaves Resend existentes não foram reutilizadas, removidas ou rotacionadas. Conta, domínio e cotas do Resend continuam compartilhados; não se trata de uma conta provedora inteiramente separada.

A API atualizou automaticamente metadados de templates customizados no sandbox. Sem snapshot anterior campo a campo, não se afirma identidade integral desses metadados; a evidência específica confirma o contrato acima e a preservação de Auth de produção.

## Prova real de envio e confirmação

O teste ocorreu no navegador autorizado, no Preview desta branch, com o painel em 358 px. O cadastro foi enviado pela UI; o primeiro e-mail foi entregue. O botão “Reenviar código” produziu um segundo e-mail entregue. Ambos continham somente o OTP de oito dígitos em português. O código do segundo e-mail foi digitado na aplicação e aceito, redirecionando ao onboarding, etapa 1. A conta não foi confirmada por administração.

A leitura posterior confirmou `email_confirmed_at` preenchido e ausência de perfil/draft de onboarding, consistente com a chegada à primeira etapa antes de preencher os dados. Não são publicados e-mail real, código ou credenciais.

A chegada ao onboarding foi recapturada em 320 × 812, 390 × 844 e 430 × 932 px, sem overflow horizontal. Documento/scroll: 305/305, 390/390 e 430/430 px, respectivamente; o viewport de 320 inclui barra de rolagem de 15 px. O fluxo de OTP não foi repetido nessas três larguras: somente sua tela de destino foi inspecionada. Os 22 testes de contratos Auth/OTP/convites também passaram em rodada direcionada.

Evidências externas sanitizadas: `auth-smtp-readback-sanitized.json`, `otp-preview-browser-result.json` e `otp-browser-persistence.json`. Capturas nativas JPEG: `otp-preview-358.jpg`, `otp-confirmed-onboarding-358.jpg`, `otp-confirmed-onboarding-320.jpg`, `otp-confirmed-onboarding-390.jpg` e `otp-confirmed-onboarding-430.jpg`. O adendo `cheipi-confirmacao-cadastro-2026-09-08.zip` reúne somente essas cinco imagens, fora do repositório.
## Aplicação por ambiente

O arquivo HTML é a referência versionada; um deploy da aplicação não atualiza templates hospedados automaticamente. Configurações de `supabase/config.toml` pertencem ao desenvolvimento local e não comprovam o estado do projeto remoto.

O sandbox desta revisão é `smqkpqpixnglkflhwxhr`. Antes de aplicar qualquer ajuste, verificar o identificador do projeto na URL da Management API. Ler a configuração atual e alterar somente os campos necessários, preservando SMTP, expiração, limites de envio e confirmação obrigatória. Não executar `supabase config push` com o arquivo local para corrigir um único template.

O `emailRedirectTo` de signup e reenvio também precisa estar na allowlist de Auth. Preservar as entradas existentes ao adicionar o Preview. Não apontar para produção.

Após aplicar, reler a configuração e conferir conteúdo, tamanho do código e confirmação obrigatória. Validar um código real de uma conta fictícia contra a API pública. Essa prova não substitui a entrega por SMTP: para validar a caixa de entrada, usar um e-mail de testes autorizado e digitar o código diretamente na aplicação, sem publicá-lo em chat, logs ou PR.

Se o provedor padrão impedir personalização do template, configurar um SMTP de testes autorizado; não desativar a confirmação de e-mail para contornar a restrição.

## Referências

- [Supabase: templates de e-mail e variável Token](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase: URLs de redirecionamento](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase: limitações do SMTP padrão](https://supabase.com/docs/guides/auth/auth-smtp)
