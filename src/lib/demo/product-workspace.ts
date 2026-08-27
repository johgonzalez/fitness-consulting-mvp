import "server-only";

import { assessmentDemoDetails, assessmentDemoTemplates } from "@/data/demo/assessments";
import { demoWorkspaceFixture } from "@/lib/demo/fixture";
import type { AssessmentDetail } from "@/lib/domain/assessments";
import type { ManagedInvitation, ManagedLead, ManagedStudent } from "@/lib/domain/students";

type DemoProductState = {
  leads: ManagedLead[];
  students: ManagedStudent[];
  invitations: ManagedInvitation[];
  assessments: AssessmentDetail[];
  convertedStudents: Record<string, string>;
};

declare global {
  var __pperfilDemoProductState: DemoProductState | undefined;
}

function initialState(): DemoProductState {
  return {
    leads: structuredClone(demoWorkspaceFixture.leads.matches),
    students: structuredClone(demoWorkspaceFixture.students.students),
    invitations: structuredClone(demoWorkspaceFixture.students.invitations),
    assessments: structuredClone(assessmentDemoDetails),
    convertedStudents: {},
  };
}

function state() {
  globalThis.__pperfilDemoProductState ??= initialState();
  return globalThis.__pperfilDemoProductState;
}

export function getDemoLeads() {
  return structuredClone(state().leads);
}

export function getDemoStudents() {
  return structuredClone(state().students);
}

export function getDemoInvitations() {
  return structuredClone(state().invitations.filter((invitation) => invitation.status !== "revoked"));
}

export function createDemoInvitation(name: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (state().invitations.some((invitation) => invitation.status === "pending" && invitation.email.toLowerCase() === normalizedEmail)) {
    throw new Error("invitation_not_available");
  }
  const token = crypto.randomUUID().replaceAll("-", "").repeat(2);
  const invitation: ManagedInvitation = {
    id: crypto.randomUUID(),
    name,
    email: normalizedEmail,
    status: "pending",
    expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    createdAt: new Date().toISOString(),
    lastDeliveryAttemptAt: new Date().toISOString(),
    lastDeliveryStatus: "pending",
  };
  state().invitations.unshift(invitation);
  return { invitation, token };
}

export function revokeDemoInvitation(invitationId: string) {
  const invitation = state().invitations.find((item) => item.id === invitationId);
  if (!invitation || invitation.status !== "pending") throw new Error("invitation_not_available");
  invitation.status = "revoked";
}

export function getDemoAssessments() {
  return structuredClone(state().assessments);
}

export function rejectDemoLead(matchId: string) {
  const match = state().leads.find((item) => item.id === matchId);
  if (!match || (match.state !== "new" && match.state !== "pending")) throw new Error("lead_not_actionable");
  match.status = "rejected";
  match.state = "rejected";
}

export function convertDemoLead(matchId: string) {
  const workspace = state();
  const match = workspace.leads.find((item) => item.id === matchId);
  if (!match || (match.state !== "new" && match.state !== "pending")) throw new Error("lead_not_actionable");
  if (!match.lead.email) throw new Error("lead_email_required");
  const existing = workspace.convertedStudents[matchId];
  if (existing) return existing;

  match.status = "converted";
  match.state = "converted";
  const suffix = match.id.slice(-12);
  const studentId = `75f00000-0000-4000-8000-${suffix}`;
  workspace.students.unshift({
    id: studentId,
    studentProfileId: `75f10000-0000-4000-8000-${suffix}`,
    name: match.lead.firstName,
    email: match.lead.email,
    status: "active",
    origin: "lead_conversion",
    startedAt: new Date().toISOString(),
    inactiveAt: null,
    endedAt: null,
  });
  workspace.convertedStudents[matchId] = studentId;
  return studentId;
}

export function createDemoAssessment(input: {
  relationshipId: string;
  templateVersionId: string;
  title: string;
  isRequired: boolean;
  dueAt: string | null;
  sendNow: boolean;
}) {
  const workspace = state();
  const student = workspace.students.find((item) => item.id === input.relationshipId && item.status === "active");
  const template = assessmentDemoTemplates.find((item) => item.versions.some((version) => version.id === input.templateVersionId));
  const version = template?.versions.find((item) => item.id === input.templateVersionId);
  if (!student || !template || !version) throw new Error("assessment_not_available");
  const now = new Date().toISOString();
  const assessment: AssessmentDetail = {
    id: crypto.randomUUID(),
    trainerStudentRelationshipId: student.id,
    templateVersionId: version.id,
    status: input.sendNow ? "SENT" : "DRAFT",
    title: input.title || template.name,
    isRequired: input.isRequired,
    dueAt: input.dueAt,
    sentAt: input.sendNow ? now : null,
    answeredAt: null,
    reviewStartedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    trainerFeedback: null,
    templateSchema: structuredClone(version.schema),
    answers: [],
  };
  workspace.assessments.unshift(assessment);
  return { assessment: structuredClone(assessment), student: structuredClone(student) };
}

export function sendDemoAssessment(assessmentId: string) {
  const workspace = state();
  const assessment = workspace.assessments.find((item) => item.id === assessmentId);
  if (!assessment || assessment.status !== "DRAFT") throw new Error("assessment_not_available");
  const student = workspace.students.find((item) => item.id === assessment.trainerStudentRelationshipId && item.status === "active");
  if (!student) throw new Error("relationship_not_active");
  const now = new Date().toISOString();
  assessment.status = "SENT";
  assessment.sentAt = now;
  assessment.updatedAt = now;
  return { assessment: structuredClone(assessment), student: structuredClone(student) };
}
