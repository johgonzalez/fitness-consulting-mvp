import { expect, test } from "@playwright/test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fingerprintFiles, parseApprovalArtifact, parseApprovalRequest, persistApproval, readApprovalState } from "../../src/app/design-lab/v1/approval-server";
import { resolveInitialDecisions, type ApprovalArtifact, type CompleteDecisions } from "../../src/app/design-lab/v1/gate-1b";

const sha = "a".repeat(40);
const decisions: CompleteDecisions = { visualTerritory: "D", primaryButton: "B01", fieldSystem: "F02", iconography: "I02" };

async function fixtureRepository() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "pperfil-gate-1b-"));
  const git = path.join(root, ".git");
  await fs.mkdir(path.join(git, "refs", "heads", "codex"), { recursive: true });
  await fs.writeFile(path.join(git, "HEAD"), "ref: refs/heads/codex/product-visual-foundation-v1\n");
  await fs.writeFile(path.join(git, "refs", "heads", "codex", "product-visual-foundation-v1"), `${sha}\n`);
  for (const file of fingerprintFiles) {
    const target = path.join(root, ...file.split("/"));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, `fixture:${file}\n`);
  }
  const log = path.join(root, "docs", "design", "DECISION_LOG_V1.md");
  await fs.mkdir(path.dirname(log), { recursive: true });
  await fs.writeFile(log, "# Decision Log\n");
  return root;
}

test("strict request contract rejects invalid IDs, extra fields and path injection", () => {
  expect(parseApprovalRequest({ action: "approve", gateId: "GATE_1B", decisions })).toEqual({ action: "approve", gateId: "GATE_1B", decisions });
  expect(parseApprovalRequest({ action: "approve", gateId: "GATE_1B", decisions: { ...decisions, visualTerritory: "E" } })).toBeNull();
  expect(parseApprovalRequest({ action: "approve", gateId: "GATE_1B", decisions, path: "../../PRODUCT.md" })).toBeNull();
  expect(parseApprovalRequest({ action: "reopen", gateId: "GATE_1B", path: "x" })).toBeNull();
});

test("approval is deterministic, idempotent and parseable by future Codex runs", async () => {
  const root = await fixtureRepository();
  try {
    const request = parseApprovalRequest({ action: "approve", gateId: "GATE_1B", decisions });
    expect(request).not.toBeNull();
    const first = await persistApproval(request!, root, new Date("2026-09-01T12:00:00.000Z"));
    const second = await persistApproval(request!, root, new Date("2026-09-01T13:00:00.000Z"));
    expect(first.idempotent).toBe(false);
    expect(second.idempotent).toBe(true);
    expect(second.artifact).toEqual(first.artifact);
    const raw = await fs.readFile(path.join(root, "docs", "design", "approvals", "GATE_1B.json"), "utf8");
    const parsed = parseApprovalArtifact(JSON.parse(raw));
    expect(parsed?.decisions).toEqual(decisions);
    expect(Object.keys(parsed ?? {}).sort()).toEqual(["approvedAt","branch","decisions","gateId","labFingerprint","labVersion","preservedDecisions","revision","schemaVersion","sourceCommit","status"].sort());
    expect(raw).not.toContain("email");
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("approved repository state overrides a conflicting browser draft", () => {
  const artifact = { status: "APPROVED", decisions } as ApprovalArtifact;
  expect(resolveInitialDecisions(artifact, { visualTerritory: "A", primaryButton: "B05" })).toEqual(decisions);
});

test("reopen preserves append-only history and advances the revision", async () => {
  const root = await fixtureRepository();
  try {
    await persistApproval({ action: "approve", gateId: "GATE_1B", decisions }, root, new Date("2026-09-01T12:00:00.000Z"));
    const result = await persistApproval({ action: "reopen", gateId: "GATE_1B" }, root, new Date("2026-09-02T12:00:00.000Z"));
    expect(result.artifact.status).toBe("REOPENED");
    expect(result.artifact.revision).toBe(2);
    const history = JSON.parse(await fs.readFile(path.join(root, "docs", "design", "approvals", "history", "GATE_1B_REV_001.json"), "utf8")) as ApprovalArtifact;
    expect(history.status).toBe("APPROVED");
    expect(history.decisions).toEqual(decisions);
    await expect(persistApproval({ action: "reopen", gateId: "GATE_1B" }, root)).rejects.toThrow("CONFLICT_NOT_APPROVED");
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("fingerprint drift is reported as stale without revoking approval", async () => {
  const root = await fixtureRepository();
  try {
    await persistApproval({ action: "approve", gateId: "GATE_1B", decisions }, root);
    await fs.appendFile(path.join(root, ...fingerprintFiles[0].split("/")), "material change\n");
    const state = await readApprovalState(root);
    expect(state.artifact?.status).toBe("APPROVED");
    expect(state.stale).toBe(true);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("approval implementation has no database client, shell, git command or arbitrary client path", async () => {
  const source = await fs.readFile(path.resolve("src/app/design-lab/v1/approval-server.ts"), "utf8");
  expect(source).not.toMatch(/supabase|child_process|execSync|spawnSync|git commit|git push/i);
  expect(source).not.toMatch(/request\.(path|file|directory)/);
});

test("production approval endpoint is unavailable before reading the request body", async () => {
  const original = process.env.NODE_ENV;
  Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true, enumerable: true });
  try {
    const { POST } = await import("../../src/app/api/design-lab/approval/route");
    const request = new Request("http://127.0.0.1:3107/api/design-lab/approval", {
      method: "POST",
      headers: { Origin: "http://127.0.0.1:3107", "Content-Type": "text/plain" },
      body: "this body must not be parsed",
    });
    expect((await POST(request)).status).toBe(404);
  } finally {
    Object.defineProperty(process.env, "NODE_ENV", { value: original, writable: true, configurable: true, enumerable: true });
  }
});
