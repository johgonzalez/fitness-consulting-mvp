"use client";

import { ArrowUpRight, Check } from "lucide-react";
import { useState } from "react";
import styles from "./spotlight.module.css";

export function SpotlightShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: window.location.href });
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1100);
    } catch {
      // A canceled native share sheet is not an application error.
    }
  };

  return (
    <button className={styles.iconButton} type="button" onClick={share} aria-label="Compartilhar perfil">
      {copied ? <Check aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}
    </button>
  );
}
