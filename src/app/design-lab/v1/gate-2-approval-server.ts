import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  fixedShellRules,
  GATE_2_EXPECTED_BRANCH,
  GATE_2_ID,
  GATE_2_LAB_VERSION,
  inheritedFoundation,
  studentIdentityIds,
  trainerNavigationIds,
  type Gate2ApprovalArtifact,
  type Gate2ApprovalRequest,
  type Gate2Decisions,
} from "./gate-2";

const APPROVAL_PATH = path.join("docs", "design", "approvals", "GATE_2_APP_SHELL.json");
const HISTORY_DIRECTORY = path.join("docs", "design", "approvals", "history");
const DECISION_LOG_PATH = path.join("docs", "design", "DECISION_LOG_V1.md");
const FOUNDATION_PATH = path.join("docs", "design", "approvals", "GATE_1B.json");
const LOG_START = "<!-- GATE_2_APP_SHELL:START -->";
const LOG_END = "<!-- GATE_2_APP_SHELL:END -->";
const shaPattern = /^[0-9a-f]{40}$/;

export const gate2FingerprintFiles = [
  "src/app/design-lab/v1/gate-2.ts",
  "src/app/design-lab/v1/Gate2ShellLab.tsx",
  "src/app/design-lab/v1/gate-2.module.css",
  "src/app/design-lab/v1/gate-2-approval-server.ts",
  "src/app/api/design-lab/gate-2-approval/route.ts",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  const actual = Object.keys(value).sort();
  const expected = [...allowed].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isDecisions(value: unknown): value is Gate2Decisions {
  if (!isRecord(value) || !exactKeys(value, ["trainerMobileNavigation", "studentIdentity"])) return false;
  return trainerNavigationIds.includes(value.trainerMobileNavigation as Gate2Decisions["trainerMobileNavigation"])
    && studentIdentityIds.includes(value.studentIdentity as Gate2Decisions["studentIdentity"]);
}

export function parseGate2ApprovalRequest(value: unknown): Gate2ApprovalRequest | null {
  if (!isRecord(value) || value.gateId !== GATE_2_ID || typeof value.action !== "string") return null;
  if (value.action === "approve") {
    if (!exactKeys(value, ["action", "gateId", "decisions"]) || !isDecisions(value.decisions)) return null;
    return { action: "approve", gateId: GATE_2_ID, decisions: value.decisions };
  }
  if (value.action === "reopen") {
    if (!exactKeys(value, ["action", "gateId"])) return null;
    return { action: "reopen", gateId: GATE_2_ID };
  }
  return null;
}

export function parseGate2ApprovalArtifact(value: unknown): Gate2ApprovalArtifact | null {
  if (!isRecord(value)) return null;
  const allowed = ["schemaVersion", "gateId", "revision", "status", "approvedAt", "reopenedAt", "branch", "sourceCommit", "labVersion", "labFingerprint", "decisions", "inheritedFoundation", "fixedShellRules"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) return null;
  if (value.schemaVersion !== 1 || value.gateId !== GATE_2_ID || !Number.isInteger(value.revision) || (value.revision as number) < 1) return null;
  if (value.status !== "APPROVED" && value.status !== "REOPENED") return null;
  if (typeof value.approvedAt !== "string" || (value.reopenedAt !== undefined && typeof value.reopenedAt !== "string")) return null;
  if (value.branch !== GATE_2_EXPECTED_BRANCH || typeof value.sourceCommit !== "string" || !shaPattern.test(value.sourceCommit)) return null;
  if (typeof value.labVersion !== "string" || typeof value.labFingerprint !== "string" || !/^[0-9a-f]{64}$/.test(value.labFingerprint)) return null;
  if (!isDecisions(value.decisions)) return null;
  if (JSON.stringify(value.inheritedFoundation) !== JSON.stringify(inheritedFoundation)) return null;
  if (JSON.stringify(value.fixedShellRules) !== JSON.stringify(fixedShellRules)) return null;
  return value as Gate2ApprovalArtifact;
}

function insideRepository(root: string, relativePath: string) {
  const resolvedRoot = path.resolve(/* turbopackIgnore: true */ root);
  const resolved = path.resolve(/* turbopackIgnore: true */ root, relativePath);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error("Unsafe repository path");
  return resolved;
}

async function readOptional(filePath: string) {
  try { return await fs.readFile(/* turbopackIgnore: true */ filePath, "utf8"); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function computeGate2Fingerprint(root = process.cwd()) {
  const hash = createHash("sha256");
  for (const file of gate2FingerprintFiles) {
    hash.update(file.replaceAll("\\", "/"));
    hash.update("\0");
    hash.update(await fs.readFile(/* turbopackIgnore: true */ insideRepository(root, file)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function resolveGitDirectory(root: string) {
  const dotGit = insideRepository(root, ".git");
  const stat = await fs.stat(/* turbopackIgnore: true */ dotGit);
  if (stat.isDirectory()) return dotGit;
  const pointer = (await fs.readFile(/* turbopackIgnore: true */ dotGit, "utf8")).trim();
  if (!pointer.startsWith("gitdir: ")) throw new Error("Unsupported .git pointer");
  return path.resolve(/* turbopackIgnore: true */ root, pointer.slice(8));
}

async function readGitIdentity(root = process.cwd()) {
  const gitDirectory = await resolveGitDirectory(root);
  const head = (await fs.readFile(/* turbopackIgnore: true */ path.join(gitDirectory, "HEAD"), "utf8")).trim();
  if (!head.startsWith("ref: refs/heads/")) throw new Error("Detached HEAD is not allowed for approval");
  const ref = head.slice(5);
  const branch = ref.slice("refs/heads/".length);
  const commonPointer = await readOptional(path.join(gitDirectory, "commondir"));
  const common = commonPointer ? path.resolve(/* turbopackIgnore: true */ gitDirectory, commonPointer.trim()) : gitDirectory;
  let sourceCommit = (await readOptional(path.join(common, ...ref.split("/"))))?.trim() ?? "";
  if (!sourceCommit) {
    const packed = await readOptional(path.join(common, "packed-refs"));
    sourceCommit = packed?.split(/\r?\n/).find((line) => line.endsWith(` ${ref}`))?.split(" ")[0] ?? "";
  }
  if (branch !== GATE_2_EXPECTED_BRANCH || !shaPattern.test(sourceCommit)) throw new Error("Approval requires the authorized branch and a readable commit");
  return { branch: GATE_2_EXPECTED_BRANCH, sourceCommit } as const;
}

async function assertFoundation(root: string) {
  const raw = await fs.readFile(/* turbopackIgnore: true */ insideRepository(root, FOUNDATION_PATH), "utf8");
  const artifact = JSON.parse(raw) as { status?: string; decisions?: Record<string, string> };
  if (artifact.status !== "APPROVED" || JSON.stringify(artifact.decisions) !== JSON.stringify(inheritedFoundation)) {
    throw new Error("Gate 1B approved foundation is required");
  }
}

export async function readGate2ApprovalState(root = process.cwd()) {
  await assertFoundation(root);
  const raw = await readOptional(insideRepository(root, APPROVAL_PATH));
  const currentFingerprint = await computeGate2Fingerprint(root);
  if (!raw) return { artifact: null, stale: false, currentFingerprint };
  const artifact = parseGate2ApprovalArtifact(JSON.parse(raw));
  if (!artifact) throw new Error("GATE_2_APP_SHELL.json is invalid");
  return { artifact, stale: artifact.labVersion !== GATE_2_LAB_VERSION || artifact.labFingerprint !== currentFingerprint, currentFingerprint };
}

function serialize(artifact: Gate2ApprovalArtifact) {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}

function decisionLogBlock(artifact: Gate2ApprovalArtifact) {
  const reopened = artifact.status === "REOPENED" ? `\nReopened At: ${artifact.reopenedAt}` : "";
  return `${LOG_START}\n## GATE 2 — APP SHELL\n\nSTATUS: **${artifact.status}**\n\nTrainer Mobile Navigation: ${artifact.decisions.trainerMobileNavigation}\n\nStudent Identity: ${artifact.decisions.studentIdentity}\n\nInherited Foundation: D / B01 / F02 / I01\n\nApproved At: ${artifact.approvedAt}${reopened}\n${LOG_END}`;
}

async function writeDecisionLog(root: string, artifact: Gate2ApprovalArtifact) {
  const logPath = insideRepository(root, DECISION_LOG_PATH);
  const current = await fs.readFile(/* turbopackIgnore: true */ logPath, "utf8");
  const block = decisionLogBlock(artifact);
  const start = current.indexOf(LOG_START);
  const end = current.indexOf(LOG_END);
  const next = start >= 0 && end > start
    ? `${current.slice(0, start)}${block}${current.slice(end + LOG_END.length)}`
    : `${current.trimEnd()}\n\n${block}\n`;
  await fs.writeFile(logPath, next, "utf8");
}

function sameDecisions(left: Gate2Decisions, right: Gate2Decisions) {
  return left.trainerMobileNavigation === right.trainerMobileNavigation && left.studentIdentity === right.studentIdentity;
}

export async function persistGate2Approval(request: Gate2ApprovalRequest, root = process.cwd(), now = new Date()) {
  await assertFoundation(root);
  const { artifact: current, currentFingerprint } = await readGate2ApprovalState(root);
  const identity = await readGitIdentity(root);
  const approvalPath = insideRepository(root, APPROVAL_PATH);
  await fs.mkdir(path.dirname(approvalPath), { recursive: true });

  if (request.action === "approve") {
    if (current?.status === "APPROVED") {
      if (sameDecisions(current.decisions, request.decisions)) return { artifact: current, idempotent: true };
      throw new Error("CONFLICT_APPROVED");
    }
    const artifact: Gate2ApprovalArtifact = {
      schemaVersion: 1,
      gateId: GATE_2_ID,
      revision: current?.revision ?? 1,
      status: "APPROVED",
      approvedAt: now.toISOString(),
      branch: identity.branch,
      sourceCommit: identity.sourceCommit,
      labVersion: GATE_2_LAB_VERSION,
      labFingerprint: currentFingerprint,
      decisions: request.decisions,
      inheritedFoundation,
      fixedShellRules,
    };
    await fs.writeFile(approvalPath, serialize(artifact), { encoding: "utf8", flag: "w" });
    await writeDecisionLog(root, artifact);
    return { artifact, idempotent: false };
  }

  if (!current || current.status !== "APPROVED") throw new Error("CONFLICT_NOT_APPROVED");
  const historyDirectory = insideRepository(root, HISTORY_DIRECTORY);
  await fs.mkdir(historyDirectory, { recursive: true });
  const historyPath = insideRepository(root, path.join(HISTORY_DIRECTORY, `GATE_2_APP_SHELL_REV_${String(current.revision).padStart(3, "0")}.json`));
  const existing = await readOptional(historyPath);
  const serialized = serialize(current);
  if (existing && existing !== serialized) throw new Error("CONFLICT_HISTORY");
  if (!existing) await fs.writeFile(historyPath, serialized, { encoding: "utf8", flag: "wx" });
  const reopened: Gate2ApprovalArtifact = { ...current, revision: current.revision + 1, status: "REOPENED", reopenedAt: now.toISOString() };
  await fs.writeFile(approvalPath, serialize(reopened), "utf8");
  await writeDecisionLog(root, reopened);
  return { artifact: reopened, idempotent: false };
}
