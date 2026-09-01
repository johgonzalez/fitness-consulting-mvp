import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesignLabClient } from "./DesignLabClient";

export const metadata: Metadata = {
  title: "FIT APP — Decision Lab V1",
  description: "Laboratório local de decisões visuais do PPerfil.",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function DesignLabV1Page() {
  if (process.env.NODE_ENV === "production") notFound();
  const { readApprovalState } = await import("./approval-server");
  const approval = await readApprovalState();
  return <DesignLabClient repositoryArtifact={approval.artifact} stale={approval.stale} />;
}
