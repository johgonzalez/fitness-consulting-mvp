import type {
  PreviousExercisePerformance,
  StudentWorkoutHistoryItem,
  StudentWorkoutOverview,
  TrainerWorkoutExecutionSummary,
  WorkoutDifficulty,
  WorkoutExecutionMutation,
  WorkoutExecutionSnapshot,
} from "@/lib/domain/workout-executions";

export interface WorkoutExecutionRepository {
  startOrResume(workoutSessionId: string): Promise<WorkoutExecutionSnapshot>;
  sync(executionId: string, expectedServerRevision: number, mutations: WorkoutExecutionMutation[]): Promise<WorkoutExecutionSnapshot>;
  pause(executionId: string, clientMutationId: string, expectedServerRevision: number): Promise<WorkoutExecutionSnapshot>;
  resume(executionId: string, clientMutationId: string, expectedServerRevision: number): Promise<WorkoutExecutionSnapshot>;
  complete(executionId: string, clientMutationId: string, expectedServerRevision: number): Promise<WorkoutExecutionSnapshot>;
  abandon(executionId: string, clientMutationId: string, expectedServerRevision: number): Promise<WorkoutExecutionSnapshot>;
  recordFeedback(input: {
    executionId: string;
    difficulty: WorkoutDifficulty;
    studentNote: string | null;
    clientMutationId: string;
    expectedServerRevision: number;
  }): Promise<WorkoutExecutionSnapshot>;
  getStudentExecution(executionId: string): Promise<WorkoutExecutionSnapshot>;
  getTrainerExecution(executionId: string): Promise<WorkoutExecutionSnapshot>;
  getStudentOverview(workoutSessionId: string): Promise<StudentWorkoutOverview>;
  getStudentToday(): Promise<StudentWorkoutOverview[]>;
  getPreviousPerformance(exerciseId: string, beforeExecutionId?: string | null): Promise<PreviousExercisePerformance>;
  listStudentHistory(limit?: number): Promise<StudentWorkoutHistoryItem[]>;
  listTrainerExecutions(relationshipId: string, limit?: number): Promise<TrainerWorkoutExecutionSummary[]>;
}
