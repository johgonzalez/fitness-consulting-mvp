import "server-only";

import {
  getDemoWorkoutExecutionForSession,
  workoutExecutionDemoCompleted,
  workoutExecutionDemoInProgress,
  workoutExecutionDemoNotStarted,
  workoutExecutionDemoPaused,
} from "@/data/demo/workout-executions";
import { workoutDemoVersions } from "@/data/demo/workouts";
import { demoWorkspaceFixture } from "@/lib/demo/fixture";
import { isDemoWorkspaceRequest } from "@/lib/demo/workspace";
import type {
  StudentWorkoutHistoryItem,
  StudentWorkoutOverview,
  WorkoutExecutionSnapshot,
} from "@/lib/domain/workout-executions";
import type { WorkoutSession, WorkoutVersionProjection } from "@/lib/domain/workouts";
import type { CommunityChallenge } from "@/lib/domain/community";
import { listMyAcceptedCommunityChallenges } from "@/lib/supabase/community";
import { SupabaseWorkoutExecutionRepository } from "@/lib/supabase/workout-executions";
import { createClient } from "@/lib/supabase/server";
import { resolveStudentProfileImageUrl } from "@/lib/supabase/student-profile-media";
import { SupabaseWorkoutRepository } from "@/lib/supabase/workouts";
import { WorkoutExecutionService } from "@/lib/workouts/execution-service";

export type StudentWorkoutIdentity = {
  studentName: string;
  studentImageUrl: string | null;
  trainer: { name: string; imageUrl: string | null; credential: string | null };
};

export type StudentWorkoutCard = {
  overview: StudentWorkoutOverview;
  session: WorkoutSession;
  version: WorkoutVersionProjection;
};

export type StudentTodayWorkspace = {
  identity: StudentWorkoutIdentity;
  workouts: StudentWorkoutCard[];
  history: StudentWorkoutHistoryItem[];
  challenges: CommunityChallenge[];
  demoMode: boolean;
};

export type StudentWorkoutRecord = StudentWorkoutCard & {
  identity: StudentWorkoutIdentity;
  activeSnapshot: WorkoutExecutionSnapshot | null;
  demoMode: boolean;
};

function executionService() {
  return new WorkoutExecutionService(new SupabaseWorkoutExecutionRepository());
}

function demoPublishedVersion() {
  const projection = workoutDemoVersions.find((item) => item.version.status === "PUBLISHED");
  if (!projection) throw new Error("Published demo workout is missing.");
  return projection;
}

function overviewFromSnapshot(snapshot: WorkoutExecutionSnapshot): StudentWorkoutOverview {
  const exercises = snapshot.sections.flatMap((section) => section.exercises);
  const firstMedia = exercises.flatMap((exercise) => exercise.media)[0] ?? null;
  return {
    kind: "AVAILABLE_UNSCHEDULED",
    plan: { id: snapshot.plan.id, name: snapshot.plan.name, goal: snapshot.plan.goal },
    version: { ...snapshot.version },
    session: {
      id: snapshot.session.id,
      name: snapshot.session.name,
      description: snapshot.session.description,
      estimatedDurationMinutes: snapshot.session.estimatedDurationMinutes,
      sortOrder: snapshot.session.sortOrder,
      sectionCount: snapshot.sections.length,
      exerciseCount: exercises.length,
      setCount: snapshot.metrics.totalSets,
    },
    firstApprovedMedia: firstMedia && {
      id: firstMedia.id,
      mediaType: firstMedia.mediaType,
      urlOrStoragePath: firstMedia.urlOrStoragePath,
      thumbnailUrlOrPath: firstMedia.thumbnailUrlOrPath,
      provider: firstMedia.provider,
      creatorCredit: firstMedia.creatorCredit,
      sortOrder: firstMedia.sortOrder,
    },
    activeExecution: snapshot.execution.status === "COMPLETED" || snapshot.execution.status === "ABANDONED" ? null : {
      id: snapshot.execution.id,
      status: snapshot.execution.status,
      startedAt: snapshot.execution.startedAt,
      lastActivityAt: snapshot.execution.lastActivityAt,
      serverRevision: snapshot.execution.serverRevision,
    },
    hasTerminalHistory: snapshot.execution.status === "COMPLETED" || snapshot.execution.status === "ABANDONED",
  };
}

function demoIdentity(): StudentWorkoutIdentity {
  return {
    studentName: "Juliana Mendes",
    studentImageUrl: null,
    trainer: {
      name: demoWorkspaceFixture.identity.name,
      imageUrl: demoWorkspaceFixture.profile.profile_image_url ?? "/images/motion/thiago-lateral-bound.png",
      credential: demoWorkspaceFixture.profile.cref,
    },
  };
}

async function liveIdentity(relationshipId?: string): Promise<StudentWorkoutIdentity> {
  try {
    const supabase = await createClient();
    const [{ data: user }, { data: student }] = await Promise.all([
      supabase.from("app_users").select("display_name").maybeSingle(),
      supabase.from("student_profiles").select("id,preferred_name,profile_image_path").maybeSingle(),
    ]);
    let relationshipQuery = supabase
      .from("trainer_student_relationships")
      .select("trainer_profile_id")
      .eq("status", "active");
    if (relationshipId) relationshipQuery = relationshipQuery.eq("id", relationshipId);
    else if (student?.id) relationshipQuery = relationshipQuery.eq("student_profile_id", student.id);
    const { data: relationship } = await relationshipQuery.limit(1).maybeSingle();
    const { data: trainer } = relationship?.trainer_profile_id
      ? await supabase
        .from("trainer_profiles")
        .select("display_name,profile_image_url,cref")
        .eq("id", relationship.trainer_profile_id)
        .maybeSingle()
      : { data: null };
    return {
      studentName: (student?.preferred_name as string | null) || (user?.display_name as string | null) || "Aluno",
      studentImageUrl: await resolveStudentProfileImageUrl(student?.profile_image_path as string | null),
      trainer: {
        name: (trainer?.display_name as string | null) || "Seu Personal",
        imageUrl: (trainer?.profile_image_url as string | null) || null,
        credential: (trainer?.cref as string | null) || null,
      },
    };
  } catch {
    return { studentName: "Aluno", studentImageUrl: null, trainer: { name: "Seu Personal", imageUrl: null, credential: null } };
  }
}

function findSession(projection: WorkoutVersionProjection, sessionId: string) {
  return projection.sessions.find((session) => session.id === sessionId) ?? null;
}

function demoWorkouts(): StudentWorkoutCard[] {
  const version = demoPublishedVersion();
  const overviews = [
    overviewFromSnapshot(workoutExecutionDemoInProgress),
    overviewFromSnapshot(workoutExecutionDemoPaused),
    workoutExecutionDemoNotStarted,
  ];
  return overviews.flatMap((overview) => {
    const session = findSession(version, overview.session.id);
    return session ? [{ overview, session, version }] : [];
  });
}

export async function getStudentTodayWorkspace(): Promise<StudentTodayWorkspace> {
  const demoMode = await isDemoWorkspaceRequest();
  if (demoMode) {
    const demoHistoryDates = ["2026-08-24T10:05:00.000Z", "2026-08-21T12:52:00.000Z", "2026-08-19T12:52:00.000Z", "2026-08-16T12:52:00.000Z"];
    return {
      identity: demoIdentity(),
      workouts: demoWorkouts(),
      history: demoHistoryDates.map((completedAt, index) => ({
        id: index === 0 ? workoutExecutionDemoCompleted.execution.id : `5b510000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        status: "COMPLETED",
        startedAt: new Date(Date.parse(completedAt) - (2_700 + index * 180) * 1000).toISOString(),
        completedAt,
        abandonedAt: null,
        difficulty: index % 2 === 0 ? "GOOD" : "CHALLENGING",
        planName: workoutExecutionDemoCompleted.plan.name,
        sessionName: index % 2 === 0 ? "Inferiores" : "Superiores",
        activeDurationSeconds: 2_700 + index * 180,
      })),
      challenges: [{ id: "c0390000-0000-4000-8000-000000000001", groupId: "c0300000-0000-4000-8000-000000000001", groupName: "Movimento com Thiago", title: "15 minutos de cardio", instructions: "Mantenha um ritmo confortável e constante.", durationMinutes: 15, workoutSessionId: null, accepted: true, acceptanceStatus: "ACCEPTED" }],
      demoMode,
    };
  }

  const service = executionService();
  const workoutRepository = new SupabaseWorkoutRepository();
  const [overviews, history, challenges] = await Promise.all([service.getStudentToday(), service.listStudentHistory(20), listMyAcceptedCommunityChallenges().catch(() => [])]);
  const versions = new Map<string, WorkoutVersionProjection>();
  await Promise.all([...new Set(overviews.map((item) => item.version.id))].map(async (versionId) => {
    versions.set(versionId, await workoutRepository.getStudentVersion(versionId));
  }));
  const workouts = overviews.flatMap((overview) => {
    const version = versions.get(overview.version.id);
    const session = version && findSession(version, overview.session.id);
    return version && session ? [{ overview, session, version }] : [];
  });
  const relationshipId = workouts[0]?.version.plan.trainerStudentRelationshipId;
  return { identity: await liveIdentity(relationshipId), workouts, history, challenges, demoMode };
}

export async function getStudentShellIdentity(): Promise<StudentWorkoutIdentity> {
  return await isDemoWorkspaceRequest() ? demoIdentity() : liveIdentity();
}

export async function getStudentWorkoutRecord(sessionId: string): Promise<StudentWorkoutRecord | null> {
  const demoMode = await isDemoWorkspaceRequest();
  if (demoMode) {
    const item = demoWorkouts().find((workout) => workout.session.id === sessionId);
    if (!item) return null;
    return {
      ...item,
      identity: demoIdentity(),
      activeSnapshot: item.overview.activeExecution ? getDemoWorkoutExecutionForSession(sessionId) : null,
      demoMode,
    };
  }

  try {
    const service = executionService();
    const overview = await service.getStudentOverview(sessionId);
    const version = await new SupabaseWorkoutRepository().getStudentVersion(overview.version.id);
    const session = findSession(version, sessionId);
    if (!session) return null;
    const activeSnapshot = overview.activeExecution
      ? await service.getStudentExecution(overview.activeExecution.id)
      : null;
    return {
      overview,
      version,
      session,
      identity: await liveIdentity(version.plan.trainerStudentRelationshipId),
      activeSnapshot,
      demoMode,
    };
  } catch {
    return null;
  }
}
