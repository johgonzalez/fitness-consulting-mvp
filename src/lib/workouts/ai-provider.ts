import "server-only";

import { workoutDemoAiDraftOutput } from "@/data/demo/workouts";
import type { Exercise } from "@/lib/domain/workouts";
import type { WorkoutAiContext, WorkoutAiDraftOutput } from "@/lib/workouts/ai-contract";
import { validateWorkoutAiDraftOutput } from "@/lib/workouts/ai-contract";

export type WorkoutAiProviderStatus = {
  id: string;
  available: boolean;
  message: string;
};

export interface WorkoutAiProvider {
  readonly id: string;
  status(): WorkoutAiProviderStatus;
  generate(input: {
    context: WorkoutAiContext;
    exercises: Exercise[];
  }): Promise<WorkoutAiDraftOutput>;
}

class UnavailableWorkoutAiProvider implements WorkoutAiProvider {
  readonly id = "unavailable";

  status(): WorkoutAiProviderStatus {
    return {
      id: this.id,
      available: false,
      message: "A geração com IA ainda não está configurada neste ambiente.",
    };
  }

  async generate(): Promise<WorkoutAiDraftOutput> {
    throw new Error("workout_ai_provider_unavailable");
  }
}

class DemoWorkoutAiProvider implements WorkoutAiProvider {
  readonly id = "demo-deterministic-v1";

  status(): WorkoutAiProviderStatus {
    return {
      id: this.id,
      available: true,
      message: "Fixture local determinístico para avaliação da experiência.",
    };
  }

  async generate(input: { context: WorkoutAiContext; exercises: Exercise[] }) {
    const visibleIds = new Set(input.exercises.map((exercise) => exercise.id));
    return validateWorkoutAiDraftOutput(workoutDemoAiDraftOutput, visibleIds);
  }
}

export function getWorkoutAiProvider(demoMode: boolean): WorkoutAiProvider {
  return demoMode ? new DemoWorkoutAiProvider() : new UnavailableWorkoutAiProvider();
}
