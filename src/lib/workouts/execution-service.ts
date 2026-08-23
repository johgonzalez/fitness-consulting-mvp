import type { WorkoutExecutionRepository } from "@/lib/domain/workout-execution-repository";
import {
  WORKOUT_DIFFICULTIES,
  type WorkoutDifficulty,
  type WorkoutExecutionMutation,
  type WorkoutExecutionSnapshot,
} from "@/lib/domain/workout-executions";
import {
  assertExecutionMutations,
  assertExecutionUuid,
  assertServerRevision,
} from "@/lib/validation/workout-executions";

export class WorkoutExecutionService {
  constructor(private readonly executions: WorkoutExecutionRepository) {}

  startOrResume(workoutSessionId: string): Promise<WorkoutExecutionSnapshot> {
    assertExecutionUuid(workoutSessionId, "workoutSessionId");
    return this.executions.startOrResume(workoutSessionId);
  }

  sync(executionId: string, expectedServerRevision: number, mutations: WorkoutExecutionMutation[]): Promise<WorkoutExecutionSnapshot> {
    this.assertMutationEnvelope(executionId, expectedServerRevision, mutations[0]?.clientMutationId);
    assertExecutionMutations(mutations);
    return this.executions.sync(executionId, expectedServerRevision, mutations);
  }

  pause(executionId: string, clientMutationId: string, expectedServerRevision: number): Promise<WorkoutExecutionSnapshot> {
    this.assertMutationEnvelope(executionId, expectedServerRevision, clientMutationId);
    return this.executions.pause(executionId, clientMutationId, expectedServerRevision);
  }

  resume(executionId: string, clientMutationId: string, expectedServerRevision: number): Promise<WorkoutExecutionSnapshot> {
    this.assertMutationEnvelope(executionId, expectedServerRevision, clientMutationId);
    return this.executions.resume(executionId, clientMutationId, expectedServerRevision);
  }

  complete(executionId: string, clientMutationId: string, expectedServerRevision: number): Promise<WorkoutExecutionSnapshot> {
    this.assertMutationEnvelope(executionId, expectedServerRevision, clientMutationId);
    return this.executions.complete(executionId, clientMutationId, expectedServerRevision);
  }

  abandon(executionId: string, clientMutationId: string, expectedServerRevision: number): Promise<WorkoutExecutionSnapshot> {
    this.assertMutationEnvelope(executionId, expectedServerRevision, clientMutationId);
    return this.executions.abandon(executionId, clientMutationId, expectedServerRevision);
  }

  recordFeedback(input: {
    executionId: string;
    difficulty: WorkoutDifficulty;
    studentNote: string | null;
    clientMutationId: string;
    expectedServerRevision: number;
  }): Promise<WorkoutExecutionSnapshot> {
    this.assertMutationEnvelope(input.executionId, input.expectedServerRevision, input.clientMutationId);
    if (!WORKOUT_DIFFICULTIES.includes(input.difficulty)) throw new Error("difficulty is unsupported.");
    if (input.studentNote !== null && (input.studentNote.trim().length < 1 || input.studentNote.trim().length > 2000)) {
      throw new Error("studentNote must contain between 1 and 2000 characters when provided.");
    }
    return this.executions.recordFeedback({ ...input, studentNote: input.studentNote?.trim() || null });
  }

  getStudentExecution(executionId: string) {
    assertExecutionUuid(executionId, "executionId");
    return this.executions.getStudentExecution(executionId);
  }

  getTrainerExecution(executionId: string) {
    assertExecutionUuid(executionId, "executionId");
    return this.executions.getTrainerExecution(executionId);
  }

  getStudentOverview(workoutSessionId: string) {
    assertExecutionUuid(workoutSessionId, "workoutSessionId");
    return this.executions.getStudentOverview(workoutSessionId);
  }

  getStudentToday() {
    return this.executions.getStudentToday();
  }

  getPreviousPerformance(exerciseId: string, beforeExecutionId?: string | null) {
    assertExecutionUuid(exerciseId, "exerciseId");
    if (beforeExecutionId) assertExecutionUuid(beforeExecutionId, "beforeExecutionId");
    return this.executions.getPreviousPerformance(exerciseId, beforeExecutionId);
  }

  listStudentHistory(limit = 20) {
    this.assertLimit(limit);
    return this.executions.listStudentHistory(limit);
  }

  listTrainerExecutions(relationshipId: string, limit = 50) {
    assertExecutionUuid(relationshipId, "relationshipId");
    this.assertLimit(limit);
    return this.executions.listTrainerExecutions(relationshipId, limit);
  }

  private assertMutationEnvelope(executionId: string, expectedServerRevision: number, clientMutationId?: string): void {
    assertExecutionUuid(executionId, "executionId");
    assertServerRevision(expectedServerRevision);
    if (clientMutationId) assertExecutionUuid(clientMutationId, "clientMutationId");
  }

  private assertLimit(limit: number): void {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("limit must be between 1 and 100.");
  }
}
