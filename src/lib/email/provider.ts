import "server-only";

export type TransactionalEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};

export type EmailDeliveryResult =
  | { status: "sent"; providerMessageId: string }
  | { status: "failed"; reason: "not_configured" | "invalid_message" | "provider_rejected" | "network_error"; providerStatus?: number };

type EmailEnvironment = {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
};

type FetchLike = typeof fetch;
type SendOptions = { env?: EmailEnvironment; fetchImpl?: FetchLike; timeoutMs?: number };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const defaultSender = "Cheipi <onboarding@resend.dev>";

function configuredSender(env: EmailEnvironment) {
  return env.EMAIL_FROM?.trim() || defaultSender;
}

function safeLog(result: Extract<EmailDeliveryResult, { status: "failed" }>) {
  console.warn("[email] transactional delivery failed", {
    reason: result.reason,
    providerStatus: result.providerStatus,
  });
}

export async function sendTransactionalEmail(message: TransactionalEmail, options: SendOptions = {}): Promise<EmailDeliveryResult> {
  const env: EmailEnvironment = options.env ?? {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
  };
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    const result = { status: "failed", reason: "not_configured" } as const;
    safeLog(result);
    return result;
  }
  if (!emailPattern.test(message.to) || !message.subject.trim() || !message.html || !message.text || !message.idempotencyKey || message.idempotencyKey.length > 256) {
    const result = { status: "failed", reason: "invalid_message" } as const;
    safeLog(result);
    return result;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000);
  try {
    const payload: Record<string, unknown> = {
      from: configuredSender(env),
      to: [message.to],
      subject: message.subject.replace(/[\r\n]+/g, " ").trim(),
      html: message.html,
      text: message.text,
    };
    if (env.EMAIL_REPLY_TO?.trim()) payload.reply_to = env.EMAIL_REPLY_TO.trim();
    const response = await (options.fetchImpl ?? fetch)("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      const result = { status: "failed", reason: "provider_rejected", providerStatus: response.status } as const;
      safeLog(result);
      return result;
    }
    const data = await response.json().catch(() => null) as { id?: unknown } | null;
    if (!data || typeof data.id !== "string" || !data.id) {
      const result = { status: "failed", reason: "provider_rejected", providerStatus: response.status } as const;
      safeLog(result);
      return result;
    }
    return { status: "sent", providerMessageId: data.id };
  } catch {
    const result = { status: "failed", reason: "network_error" } as const;
    safeLog(result);
    return result;
  } finally {
    clearTimeout(timeout);
  }
}
