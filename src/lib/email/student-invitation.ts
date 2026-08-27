import "server-only";
import type { TransactionalEmail } from "./provider";

type StudentInvitationEmailInput = {
  invitationId: string;
  recipientEmail: string;
  trainerName?: string | null;
  inviteUrl: string;
  expiresAt: string;
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
const safeName = (value?: string | null) => value?.replace(/[\r\n]+/g, " ").trim().slice(0, 120) || "Seu Personal";

function factualExpiry(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Este convite possui prazo de validade.";
  return `Este convite expira em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(date)}.`;
}

export function buildStudentInvitationEmail(input: StudentInvitationEmailInput): TransactionalEmail {
  const trainerName = safeName(input.trainerName);
  const inviteUrl = new URL(input.inviteUrl);
  if (inviteUrl.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && inviteUrl.protocol === "http:")) throw new Error("invalid_invite_url");
  const expiry = factualExpiry(input.expiresAt);
  const escapedTrainer = escapeHtml(trainerName);
  const escapedUrl = escapeHtml(inviteUrl.toString());
  const escapedExpiry = escapeHtml(expiry);
  return {
    to: input.recipientEmail,
    subject: `${trainerName} convidou você para acompanhar seus treinos`,
    idempotencyKey: `student-invitation/${input.invitationId}`,
    text: `${trainerName} convidou você para acompanhar seus treinos no PPerfil.\n\nCrie seu acesso ou aceite o convite: ${inviteUrl.toString()}\n\n${expiry}\nPor segurança, use o mesmo e-mail que recebeu este convite. Se você não esperava esta mensagem, ignore-a.`,
    html: `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f5f5f3;color:#111827;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapedTrainer} convidou você para acompanhar seus treinos.</div><main style="max-width:560px;margin:0 auto;padding:32px 18px"><section style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:32px"><p style="margin:0 0 20px;color:#7c5cf3;font-size:14px;font-weight:700">PPerfil</p><h1 style="margin:0 0 14px;color:#111827;font-size:26px;line-height:1.2">Você recebeu um convite</h1><p style="margin:0 0 18px;color:#4b5563;font-size:16px;line-height:1.6"><strong style="color:#111827">${escapedTrainer}</strong> convidou você para acompanhar treinos, avaliações e progresso no PPerfil.</p><p style="margin:0 0 24px"><a href="${escapedUrl}" style="display:inline-block;background:#6d4bea;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;line-height:48px;padding:0 22px;border-radius:10px">Aceitar convite</a></p><p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.5">${escapedExpiry}</p><p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5">Por segurança, entre com o mesmo e-mail que recebeu esta mensagem.</p><hr style="margin:24px 0;border:0;border-top:1px solid #e5e7eb"><p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5">Se você não esperava este convite, ignore esta mensagem.</p><p style="margin:16px 0 0;word-break:break-all;color:#6b7280;font-size:12px;line-height:1.5">${escapedUrl}</p></section></main></body></html>`,
  };
}
