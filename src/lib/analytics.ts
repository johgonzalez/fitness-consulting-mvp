export type AnalyticsEvent =
  | "click_whatsapp_floating"
  | "click_whatsapp_hero"
  | "click_whatsapp_offer"
  | "click_whatsapp_final"
  | "click_instagram"
  | "click_perfil_pro"
  | "view_faq"
  | "scroll_50"
  | "scroll_90";

export function trackEvent(event: AnalyticsEvent, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") console.info("[analytics]", event, data ?? {});
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("site:analytics", { detail: { event, data } }));
  }
}
