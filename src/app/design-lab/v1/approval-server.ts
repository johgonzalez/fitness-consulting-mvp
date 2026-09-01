import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  buttonIds,
  EXPECTED_BRANCH,
  fieldIds,
  GATE_ID,
  iconIds,
  LAB_VERSION,
  preservedDecisions,
  territoryIds,
  type ApprovalArtifact,
  type ApprovalRequest,
  type CompleteDecisions,
} from "./gate-1b";

const APPROVAL_RELATIVE_PATH = path.join("docs", "design", "approvals", "GATE_1B.json");
const HISTORY_RELATIVE_DIRECTORY = path.join("docs", "design", "approvals", "history");
const DECISION_LOG_RELATIVE_PATH = path.join("docs", "design", "DECISION_LOG_V1.md");
const LOG_START = "<!-- GATE_1B:START -->";
const LOG_END = "<!-- GATE_1B:END -->";
const shaPattern = /^[0-9a-f]{40}$/;

export const fingerprintFiles = [
  "src/app/design-lab/v1/gate-1b.ts",
  "src/app/design-lab/v1/DesignLabClient.tsx",
  "src/app/design-lab/v1/design-lab.module.css",
  "src/app/design-lab/v1/approval-server.ts",
  "src/app/api/design-lab/approval/route.ts",
] as const;

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  const keys = Object.keys(value).sort();
  return keys.length === allowed.length && keys.every((key, index) => key === [...allowed].sort()[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDecisions(value: unknown): value is CompleteDecisions {
  if (!isRecord(value) || !exactKeys(value, ["visualTerritory", "primaryButton", "fieldSystem", "iconography"])) return false;
  return territoryIds.includes(value.visualTerritory as CompleteDecisions["visualTerritory"])
    && buttonIds.includes(value.primaryButton as CompleteDecisions["primaryButton"])
    && fieldIds.includes(value.fieldSystem as CompleteDecisions["fieldSystem"])
    && iconIds.includes(value.iconography as CompleteDecisions["iconography"]);
}

export function parseApprovalRequest(value: unknown): ApprovalRequest | null {
  if (!isRecord(value) || value.gateId !== GATE_ID || typeof value.action !== "string") return null;
  if (value.action === "approve") {
    if (!exactKeys(value, ["action", "gateId", "decisions"]) || !isDecisions(value.decisions)) return null;
    return { action: "approve", gateId: GATE_ID, decisions: value.decisions };
  }
  if (value.action === "reopen") {
    if (!exactKeys(value, ["action", "gateId"])) return null;
    return { action: "reopen", gateId: GATE_ID };
  }
  return null;
}

export function parseApprovalArtifact(value: unknown): ApprovalArtifact | null {
  if (!isRecord(value)) return null;
  const allowed = ["schemaVersion", "gateId", "revision", "status", "approvedAt", "reopenedAt", "branch", "sourceCommit", "labVersion", "labFingerprint", "decisions", "preservedDecisions"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) return null;
  if (value.schemaVersion !== 1 || value.gateId !== GATE_ID || !Number.isInteger(value.revision) || (value.revision as number) < 1) return null;
  if (value.status !== "APPROVED" && value.status !== "REOPENED") return null;
  if (typeof value.approvedAt !== "string" || (value.reopenedAt !== undefined && typeof value.reopenedAt !== "string")) return null;
  if (value.branch !== EXPECTED_BRANCH || typeof value.sourceCommit !== "string" || !shaPattern.test(value.sourceCommit)) return null;
  if (typeof value.labVersion !== "string" || typeof value.labFingerprint !== "string" || !/^[0-9a-f]{64}$/.test(value.labFingerprint)) return null;
  if (!isDecisions(value.decisions) || !isRecord(value.preservedDecisions)) return null;
  if (!exactKeys(value.preservedDecisions, ["operationalRows", "feedbackArchitecture", "navigationArchitecture", "motionDirection"])) return null;
  if (!Object.values(value.preservedDecisions).every((entry) => entry === true)) return null;
  return value as ApprovalArtifact;
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

export async function computeLabFingerprint(root = process.cwd()) {
  const hash = createHash("sha256");
  for (const file of fingerprintFiles) {
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

async function commonGitDirectory(gitDirectory: string) {
  const common = await readOptional(path.join(gitDirectory, "commondir"));
  return common ? path.resolve(/* turbopackIgnore: true */ gitDirectory, common.trim()) : gitDirectory;
}

export async function readGitIdentity(root = process.cwd()) {
  const gitDirectory = await resolveGitDirectory(root);
  const head = (await fs.readFile(/* turbopackIgnore: true */ path.join(gitDirectory, "HEAD"), "utf8")).trim();
  if (!head.startsWith("ref: refs/heads/")) throw new Error("Detached HEAD is not allowed for approval");
  const ref = head.slice(5);
  const branch = ref.slice("refs/heads/".length);
  const common = await commonGitDirectory(gitDirectory);
  let sourceCommit = (await readOptional(path.join(common, ...ref.split("/"))))?.trim() ?? "";
  if (!sourceCommit) {
    const packed = await readOptional(path.join(common, "packed-refs"));
    sourceCommit = packed?.split(/\r?\n/).find((line) => line.endsWith(` ${ref}`))?.split(" ")[0] ?? "";
  }
  if (branch !== EXPECTED_BRANCH || !shaPattern.test(sourceCommit)) throw new Error("Approval requires the authorized branch and a readable commit");
  return { branch: EXPECTED_BRANCH, sourceCommit } as const;
}

export async function readApprovalState(root = process.cwd()) {
  const raw = await readOptional(insideRepository(root, APPROVAL_RELATIVE_PATH));
  if (!raw) return { artifact: null, stale: false, currentFingerprint: await computeLabFingerprint(root) };
  const artifact = parseApprovalArtifact(JSON.parse(raw));
  if (!artifact) throw new Error("GATE_1B.json is invalid");
  const currentFingerprint = await computeLabFingerprint(root);
  return { artifact, stale: artifact.labVersion !== LAB_VERSION || artifact.labFingerprint !== currentFingerprint, currentFingerprint };
}

function serializeArtifact(artifact: ApprovalArtifact) {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}

function decisionLogBlock(artifact: ApprovalArtifact) {
  const reopened = artifact.status === "REOPENED" ? `\nReopened At: ${artifact.reopenedAt}` : "";
  return `${LOG_START}\n## GATE 1B\n\nSTATUS: **${artifact.status}**\n\nVisual Territory: ${artifact.decisions.visualTerritory}\n\nPrimary Button: ${artifact.decisions.primaryButton}\n\nField System: ${artifact.decisions.fieldSystem}\n\nIconography: ${artifact.decisions.iconography}\n\nApproved At: ${artifact.approvedAt}${reopened}\n${LOG_END}`;
}

async function writeDecisionLog(root: string, artifact: ApprovalArtifact) {
  const logPath = insideRepository(root, DECISION_LOG_RELATIVE_PATH);
  const current = await fs.readFile(/* turbopackIgnore: true */ logPath, "utf8");
  const block = decisionLogBlock(artifact);
  const start = current.indexOf(LOG_START);
  const end = current.indexOf(LOG_END);
  const next = start >= 0 && end > start
    ? `${current.slice(0, start)}${block}${current.slice(end + LOG_END.length)}`
    : `${current.trimEnd()}\n\n${block}\n`;
  await fs.writeFile(logPath, next, "utf8");
}

function sameDecisions(left: CompleteDecisions, right: CompleteDecisions) {
  return left.visualTerritory === right.visualTerritory && left.primaryButton === right.primaryButton
    && left.fieldSystem === right.fieldSystem && left.iconography === right.iconography;
}

export async function persistApproval(request: ApprovalRequest, root = process.cwd(), now = new Date()) {
  const { artifact: current, currentFingerprint } = await readApprovalState(root);
  const identity = await readGitIdentity(root);
  const approvalPath = insideRepository(root, APPROVAL_RELATIVE_PATH);
  await fs.mkdir(path.dirname(approvalPath), { recursive: true });

  if (request.action === "approve") {
    if (current?.status === "APPROVED") {
      if (sameDecisions(current.decisions, request.decisions)) return { artifact: current, idempotent: true };
      throw new Error("CONFLICT_APPROVED");
    }
    const artifact: ApprovalArtifact = {
      schemaVersion: 1,
      gateId: GATE_ID,
      revision: current?.revision ?? 1,
      status: "APPROVED",
      approvedAt: now.toISOString(),
      branch: identity.branch,
      sourceCommit: identity.sourceCommit,
      labVersion: LAB_VERSION,
      labFingerprint: currentFingerprint,
      decisions: request.decisions,
      preservedDecisions,
    };
    await fs.writeFile(approvalPath, serializeArtifact(artifact), { encoding: "utf8", flag: "w" });
    await writeDecisionLog(root, artifact);
    return { artifact, idempotent: false };
  }

  if (!current || current.status !== "APPROVED") throw new Error("CONFLICT_NOT_APPROVED");
  const historyDirectory = insideRepository(root, HISTORY_RELATIVE_DIRECTORY);
  await fs.mkdir(historyDirectory, { recursive: true });
  const historyPath = insideRepository(root, path.join(HISTORY_RELATIVE_DIRECTORY, `GATE_1B_REV_${String(current.revision).padStart(3, "0")}.json`));
  const existingHistory = await readOptional(historyPath);
  const serializedCurrent = serializeArtifact(current);
  if (existingHistory && existingHistory !== serializedCurrent) throw new Error("CONFLICT_HISTORY");
  if (!existingHistory) await fs.writeFile(historyPath, serializedCurrent, { encoding: "utf8", flag: "wx" });
  const reopened: ApprovalArtifact = { ...current, revision: current.revision + 1, status: "REOPENED", reopenedAt: now.toISOString() };
  await fs.writeFile(approvalPath, serializeArtifact(reopened), "utf8");
  await writeDecisionLog(root, reopened);
  return { artifact: reopened, idempotent: false };
}
