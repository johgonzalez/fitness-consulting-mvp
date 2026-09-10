import { CheckCircle2, CircleAlert, Info } from "lucide-react";
import { FeedbackMessage } from "./PPerfilPrimitives";
import styles from "./ActionFeedback.module.css";

export type ActionFeedbackState = { message: string; tone: "success" | "danger" | "info" | "warning" };

export function ActionFeedback({ feedback }: { feedback: ActionFeedbackState }) {
  const Icon = feedback.tone === "success" ? CheckCircle2 : feedback.tone === "danger" || feedback.tone === "warning" ? CircleAlert : Info;
  return <FeedbackMessage tone={feedback.tone}><span className={styles.content}><Icon aria-hidden="true" /><span>{feedback.message}</span></span></FeedbackMessage>;
}
