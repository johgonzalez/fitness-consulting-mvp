import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesignLabClient } from "./DesignLabClient";
import { Gate2ShellLab } from "./Gate2ShellLab";

export const metadata: Metadata = {
  title: "FIT APP — Decision Lab V1",
  description: "Laboratório local de decisões visuais do PPerfil.",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function DesignLabV1Page({ searchParams }: { searchParams: Promise<{ gate1?: string; gate2?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const query = await searchParams;
  const { readApprovalState } = await import("./approval-server");
  const { readGate2ApprovalState } = await import("./gate-2-approval-server");
  const [approval, gate2Approval] = await Promise.all([readApprovalState(), readGate2ApprovalState()]);
  return <>
    <DesignLabClient repositoryArtifact={query.gate1 === "draft" ? null : approval.artifact} stale={query.gate1 === "draft" ? false : approval.stale} />
    <Gate2ShellLab repositoryArtifact={query.gate2 === "draft" ? null : gate2Approval.artifact} stale={query.gate2 === "draft" ? false : gate2Approval.stale} />
  </>;
}
