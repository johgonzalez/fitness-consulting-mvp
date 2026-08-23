# Sprint 4 — dados e retenção

O Leads Beta coleta somente primeiro nome, WhatsApp, e-mail opcional, preferências de treino e consentimento. Não coleta endereço residencial, CPF, dados médicos ou outros dados sensíveis.

Regra implementada: um identificador aleatório fica em cookie `HttpOnly` por até 180 dias; somente seu hash SHA-256 é persistido. `profile_view` é deduplicado por perfil + hash na janela de 30 minutos. Envios idênticos são bloqueados por 10 minutos e cada identificador pode criar até 3 leads por hora.

Evolução prevista, fora do Sprint 4: definir com jurídico o prazo contratual de retenção, anonimizar ou excluir leads expirados, oferecer rotina operacional para solicitações de titulares e revisar limites com dados reais de abuso. Até essa definição, o acesso permanece restrito ao Personal que recebeu o match e aos processos confiáveis do produto.
