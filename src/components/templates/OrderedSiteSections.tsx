import { Children, isValidElement, type ReactNode } from "react";
import type { SiteSectionPreference } from "@/lib/domain/site-sections";

function childSectionId(child: ReactNode) {
  if (!isValidElement(child) || child.key === null) return "";
  return String(child.key).replace(/^\.\$/, "");
}

export function OrderedSiteSections({ order, children }: { order: SiteSectionPreference[]; children: ReactNode }) {
  const rank = new Map<string, number>(order.map(({ id }, index) => [id, index]));
  const ordered = Children.toArray(children).sort((left, right) => {
    const leftRank = rank.get(childSectionId(left)) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = rank.get(childSectionId(right)) ?? Number.MAX_SAFE_INTEGER;
    return leftRank - rightRank;
  });

  return <div style={{ display: "contents" }}>{ordered}</div>;
}
