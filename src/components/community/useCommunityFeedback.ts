"use client";
import { useCallback, useState } from "react";
export type CommunityFeedbackTone = "info" | "success" | "warning" | "danger";
export function useCommunityFeedback() {
  const [message, setMessage] = useState<{text:string; tone:CommunityFeedbackTone} | null>(null);
  const notify = useCallback((text:string | null, tone:CommunityFeedbackTone = "info") => setMessage(text ? {text,tone} : null), []);
  return [message, notify] as const;
}
