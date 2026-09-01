export const GATE_2_ID = "GATE_2_APP_SHELL" as const;
export const GATE_2_LAB_VERSION = "gate-2-app-shell.v1" as const;
export const GATE_2_DRAFT_STORAGE_KEY = "pperfil.design-lab.gate-2-app-shell.v1" as const;
export const GATE_2_EXPECTED_BRANCH = "codex/product-visual-foundation-v1" as const;

export const trainerNavigationIds = ["G2-01A", "G2-01B", "G2-01C"] as const;
export const studentIdentityIds = ["G2-02A", "G2-02B", "G2-02C"] as const;

export type TrainerNavigationId = (typeof trainerNavigationIds)[number];
export type StudentIdentityId = (typeof studentIdentityIds)[number];
export type Gate2Status = "NOT_STARTED" | "IN_REVIEW" | "READY_TO_APPROVE" | "APPROVED" | "REOPENED" | "STALE";

export type Gate2Draft = {
  trainerMobileNavigation?: TrainerNavigationId;
  studentIdentity?: StudentIdentityId;
};

export type Gate2Decisions = Required<Gate2Draft>;

export const inheritedFoundation = {
  visualTerritory: "D",
  primaryButton: "B01",
  fieldSystem: "F02",
  iconography: "I01",
} as const;

export const fixedShellRules = {
  futureFeaturesHidden: true,
  contextualHeaders: true,
  studentWorkoutImmersiveMode: true,
  workoutBuilderMaxWorkingArea: true,
} as const;

export type Gate2ApprovalArtifact = {
  schemaVersion: 1;
  gateId: typeof GATE_2_ID;
  revision: number;
  status: "APPROVED" | "REOPENED";
  approvedAt: string;
  reopenedAt?: string;
  branch: typeof GATE_2_EXPECTED_BRANCH;
  sourceCommit: string;
  labVersion: string;
  labFingerprint: string;
  decisions: Gate2Decisions;
  inheritedFoundation: typeof inheritedFoundation;
  fixedShellRules: typeof fixedShellRules;
};

export type Gate2ApprovalRequest =
  | { action: "approve"; gateId: typeof GATE_2_ID; decisions: Gate2Decisions }
  | { action: "reopen"; gateId: typeof GATE_2_ID };

export const trainerNavigationLabels: Record<TrainerNavigationId, string> = {
  "G2-01A": "Operational",
  "G2-01B": "Growth",
  "G2-01C": "Coaching",
};

export const studentIdentityLabels: Record<StudentIdentityId, string> = {
  "G2-02A": "Trainer First",
  "G2-02B": "Balanced",
  "G2-02C": "Platform First",
};

export const trainerNavigationDestinations: Record<TrainerNavigationId, readonly string[]> = {
  "G2-01A": ["Início", "Alunos", "Treinos", "Leads", "Mais"],
  "G2-01B": ["Início", "Leads", "Meu Site", "Alunos", "Mais"],
  "G2-01C": ["Início", "Alunos", "Treinos", "Meu Site", "Mais"],
};

export function isGate2Complete(value: Gate2Draft): value is Gate2Decisions {
  return trainerNavigationIds.includes(value.trainerMobileNavigation as TrainerNavigationId)
    && studentIdentityIds.includes(value.studentIdentity as StudentIdentityId);
}

export function deriveGate2Status(value: Gate2Draft, artifact: Gate2ApprovalArtifact | null, stale: boolean): Gate2Status {
  if (artifact?.status === "APPROVED") return stale ? "STALE" : "APPROVED";
  if (artifact?.status === "REOPENED") return isGate2Complete(value) ? "READY_TO_APPROVE" : "REOPENED";
  const count = Object.values(value).filter(Boolean).length;
  if (count === 0) return "NOT_STARTED";
  return isGate2Complete(value) ? "READY_TO_APPROVE" : "IN_REVIEW";
}

export function resolveGate2InitialDecisions(artifact: Gate2ApprovalArtifact | null, draft: Gate2Draft): Gate2Draft {
  return artifact?.status === "APPROVED" ? artifact.decisions : artifact?.decisions ?? draft;
}
