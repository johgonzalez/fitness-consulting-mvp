export const LAB_VERSION = "gate-1b.v1" as const;
export const GATE_ID = "GATE_1B" as const;
export const DRAFT_STORAGE_KEY = "pperfil.design-lab.gate-1b.v1" as const;
export const EXPECTED_BRANCH = "codex/product-visual-foundation-v1" as const;

export const territoryIds = ["A", "B", "C", "D"] as const;
export const buttonIds = ["B01", "B02", "B03", "B04", "B05"] as const;
export const fieldIds = ["F01", "F02", "F03", "F04"] as const;
export const iconIds = ["I01", "I02", "I03"] as const;

export type TerritoryId = (typeof territoryIds)[number];
export type ButtonId = (typeof buttonIds)[number];
export type FieldId = (typeof fieldIds)[number];
export type IconId = (typeof iconIds)[number];
export type GateStatus = "NOT_STARTED" | "IN_REVIEW" | "READY_TO_APPROVE" | "APPROVED" | "REOPENED" | "STALE";

export type DraftSelection = {
  visualTerritory?: TerritoryId;
  primaryButton?: ButtonId;
  fieldSystem?: FieldId;
  iconography?: IconId;
};

export type CompleteDecisions = Required<DraftSelection>;

export type ApprovalArtifact = {
  schemaVersion: 1;
  gateId: typeof GATE_ID;
  revision: number;
  status: "APPROVED" | "REOPENED";
  approvedAt: string;
  reopenedAt?: string;
  branch: typeof EXPECTED_BRANCH;
  sourceCommit: string;
  labVersion: string;
  labFingerprint: string;
  decisions: CompleteDecisions;
  preservedDecisions: {
    operationalRows: true;
    feedbackArchitecture: true;
    navigationArchitecture: true;
    motionDirection: true;
  };
};

export type ApprovalRequest =
  | { action: "approve"; gateId: typeof GATE_ID; decisions: CompleteDecisions }
  | { action: "reopen"; gateId: typeof GATE_ID };

export const territoryLabels: Record<TerritoryId, string> = {
  A: "Precision / Swiss SaaS",
  B: "Soft Editorial",
  C: "Performance Utility",
  D: "Monochrome Product",
};

export const buttonLabels: Record<ButtonId, string> = {
  B01: "Solid",
  B02: "Tonal",
  B03: "Outline",
  B04: "Minimal",
  B05: "Accent",
};

export const fieldLabels: Record<FieldId, string> = {
  F01: "Hairline",
  F02: "Quiet Filled",
  F03: "Precision Outline",
  F04: "Floating Label",
};

export const iconLabels: Record<IconId, string> = {
  I01: "Rounded Outline",
  I02: "Geometric Outline",
  I03: "Controlled Filled",
};

export function isComplete(value: DraftSelection): value is CompleteDecisions {
  return territoryIds.includes(value.visualTerritory as TerritoryId)
    && buttonIds.includes(value.primaryButton as ButtonId)
    && fieldIds.includes(value.fieldSystem as FieldId)
    && iconIds.includes(value.iconography as IconId);
}

export function deriveGateStatus(value: DraftSelection, artifact: ApprovalArtifact | null, stale: boolean): GateStatus {
  if (artifact?.status === "APPROVED") return stale ? "STALE" : "APPROVED";
  if (artifact?.status === "REOPENED") return isComplete(value) ? "READY_TO_APPROVE" : "REOPENED";
  const count = Object.values(value).filter(Boolean).length;
  if (count === 0) return "NOT_STARTED";
  return isComplete(value) ? "READY_TO_APPROVE" : "IN_REVIEW";
}

export function resolveInitialDecisions(artifact: ApprovalArtifact | null, draft: DraftSelection): DraftSelection {
  return artifact?.status === "APPROVED" ? artifact.decisions : artifact?.decisions ?? draft;
}

export const preservedDecisions = {
  operationalRows: true,
  feedbackArchitecture: true,
  navigationArchitecture: true,
  motionDirection: true,
} as const;
