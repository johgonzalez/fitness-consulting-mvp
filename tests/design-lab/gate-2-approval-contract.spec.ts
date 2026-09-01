import { expect, test } from "@playwright/test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  gate2FingerprintFiles,
  parseGate2ApprovalArtifact,
  parseGate2ApprovalRequest,
  persistGate2Approval,
  readGate2ApprovalState,
} from "../../src/app/design-lab/v1/gate-2-approval-server";
import { inheritedFoundation, resolveGate2InitialDecisions, type Gate2ApprovalArtifact, type Gate2Decisions } from "../../src/app/design-lab/v1/gate-2";

const sha = "a".repeat(40);
const decisions: Gate2Decisions = { trainerMobileNavigation: "G2-01A", studentIdentity: "G2-02A" };

async function fixtureRepository(validFoundation = true) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "pperfil-gate-2-"));
  const git = path.join(root, ".git");
  await fs.mkdir(path.join(git, "refs", "heads", "codex"), { recursive: true });
  await fs.writeFile(path.join(git, "HEAD"), "ref: refs/heads/codex/product-visual-foundation-v1\n");
  await fs.writeFile(path.join(git, "refs", "heads", "codex", "product-visual-foundation-v1"), `${sha}\n`);
  for (const file of gate2FingerprintFiles) {
    const target = path.join(root, ...file.split("/"));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, `fixture:${file}\n`);
  }
  const approvals = path.join(root, "docs", "design", "approvals");
  await fs.mkdir(approvals, { recursive: true });
  await fs.writeFile(path.join(approvals, "GATE_1B.json"), JSON.stringify({ status: validFoundation ? "APPROVED" : "REOPENED", decisions: inheritedFoundation }));
  await fs.writeFile(path.join(root, "docs", "design", "DECISION_LOG_V1.md"), "# Decision Log\n");
  return root;
}

test("Gate 2 contract rejects extra fields, unknown IDs and path injection", () => {
  expect(parseGate2ApprovalRequest({ action: "approve", gateId: "GATE_2_APP_SHELL", decisions })).toEqual({ action: "approve", gateId: "GATE_2_APP_SHELL", decisions });
  expect(parseGate2ApprovalRequest({ action: "approve", gateId: "GATE_2_APP_SHELL", decisions: { ...decisions, trainerMobileNavigation: "G2-01D" } })).toBeNull();
  expect(parseGate2ApprovalRequest({ action: "approve", gateId: "GATE_2_APP_SHELL", decisions, path: "../../PRODUCT.md" })).toBeNull();
  expect(parseGate2ApprovalRequest({ action: "reopen", gateId: "GATE_2_APP_SHELL", file: "x" })).toBeNull();
});

test("Gate 2 approval is deterministic, idempotent and contains no PII", async () => {
  const root = await fixtureRepository();
  try {
    const first = await persistGate2Approval({ action: "approve", gateId: "GATE_2_APP_SHELL", decisions }, root, new Date("2026-09-01T12:00:00.000Z"));
    const second = await persistGate2Approval({ action: "approve", gateId: "GATE_2_APP_SHELL", decisions }, root, new Date("2026-09-01T13:00:00.000Z"));
    expect(first.idempotent).toBe(false);
    expect(second.idempotent).toBe(true);
    const raw = await fs.readFile(path.join(root, "docs", "design", "approvals", "GATE_2_APP_SHELL.json"), "utf8");
    const artifact = parseGate2ApprovalArtifact(JSON.parse(raw));
    expect(artifact?.decisions).toEqual(decisions);
    expect(artifact?.inheritedFoundation).toEqual(inheritedFoundation);
    expect(raw).not.toMatch(/email|João|Thiago/i);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("approved repository state overrides the Gate 2 browser draft", () => {
  const artifact = { status: "APPROVED", decisions } as Gate2ApprovalArtifact;
  expect(resolveGate2InitialDecisions(artifact, { trainerMobileNavigation: "G2-01C", studentIdentity: "G2-02C" })).toEqual(decisions);
});

test("Gate 2 cannot persist without the canonical approved Gate 1B", async () => {
  const root = await fixtureRepository(false);
  try {
    await expect(persistGate2Approval({ action: "approve", gateId: "GATE_2_APP_SHELL", decisions }, root)).rejects.toThrow("Gate 1B approved foundation is required");
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("Gate 2 reopening preserves append-only history", async () => {
  const root = await fixtureRepository();
  try {
    await persistGate2Approval({ action: "approve", gateId: "GATE_2_APP_SHELL", decisions }, root, new Date("2026-09-01T12:00:00.000Z"));
    const reopened = await persistGate2Approval({ action: "reopen", gateId: "GATE_2_APP_SHELL" }, root, new Date("2026-09-02T12:00:00.000Z"));
    expect(reopened.artifact.status).toBe("REOPENED");
    expect(reopened.artifact.revision).toBe(2);
    const history = JSON.parse(await fs.readFile(path.join(root, "docs", "design", "approvals", "history", "GATE_2_APP_SHELL_REV_001.json"), "utf8")) as Gate2ApprovalArtifact;
    expect(history.status).toBe("APPROVED");
    expect(history.decisions).toEqual(decisions);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("Gate 2 fingerprint drift is stale without revoking approval", async () => {
  const root = await fixtureRepository();
  try {
    await persistGate2Approval({ action: "approve", gateId: "GATE_2_APP_SHELL", decisions }, root);
    await fs.appendFile(path.join(root, ...gate2FingerprintFiles[0].split("/")), "change\n");
    const state = await readGate2ApprovalState(root);
    expect(state.artifact?.status).toBe("APPROVED");
    expect(state.stale).toBe(true);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("Gate 2 approval code has no database, shell, git mutation or client path", async () => {
  const source = await fs.readFile(path.resolve("src/app/design-lab/v1/gate-2-approval-server.ts"), "utf8");
  expect(source).not.toMatch(/supabase|child_process|execSync|spawnSync|git commit|git push/i);
  expect(source).not.toMatch(/request\.(path|file|directory)/);
});

test("production Gate 2 approval endpoint is unavailable before body parsing", async () => {
  const original = process.env.NODE_ENV;
  Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true, enumerable: true });
  try {
    const { POST } = await import("../../src/app/api/design-lab/gate-2-approval/route");
    const request = new Request("http://127.0.0.1:3107/api/design-lab/gate-2-approval", { method: "POST", headers: { Origin: "http://127.0.0.1:3107", "Content-Type": "text/plain" }, body: "must not be parsed" });
    expect((await POST(request)).status).toBe(404);
  } finally {
    Object.defineProperty(process.env, "NODE_ENV", { value: original, writable: true, configurable: true, enumerable: true });
  }
});
