export type LeadLifecycleState = "new" | "pending" | "converted" | "rejected" | "expired";
export type RelationshipState = "active" | "inactive" | "ended";

export interface ManagedLead {
  id: string; leadId: string; trainerId: string; score: number;
  status: Exclude<LeadLifecycleState, "expired">; state: LeadLifecycleState;
  reservedUntil: string; createdAt: string;
  lead: { firstName: string; whatsapp: string; email: string | null; goal: string; serviceMode: string; city: string | null; state: string | null; budgetBand: string; startTiming: string };
}

export interface ManagedStudent {
  id: string; studentProfileId: string; name: string; email: string | null;
  status: RelationshipState; origin: "invitation" | "lead_conversion";
  startedAt: string; inactiveAt: string | null; endedAt: string | null;
}

export interface ManagedInvitation {
  id: string; name: string | null; email: string; status: "pending" | "expired";
  expiresAt: string; createdAt: string;
}

export interface CreatedInvitation { invitationId: string; token: string; expiresAt: string; conversionId?: string }
