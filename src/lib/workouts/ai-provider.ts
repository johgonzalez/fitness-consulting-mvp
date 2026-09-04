import "server-only";

import { workoutDemoAiDraftOutput } from "@/data/demo/workouts";
import type { Exercise } from "@/lib/domain/workouts";
import type { WorkoutAiContext, WorkoutAiDraftOutput } from "@/lib/workouts/ai-contract";
import { validateWorkoutAiDraftOutput } from "@/lib/workouts/ai-contract";

export type WorkoutAiProviderStatus = { id: string; available: boolean; message: string };

export interface WorkoutAiProvider {
  readonly id: string;
  status(): WorkoutAiProviderStatus;
  generate(input: { context: WorkoutAiContext; exercises: Exercise[] }): Promise<WorkoutAiDraftOutput>;
}

const nullableNumber = { anyOf: [{ type: "number" }, { type: "null" }] } as const;
const nullableInteger = { anyOf: [{ type: "integer" }, { type: "null" }] } as const;
const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] } as const;

const workoutDraftJsonSchema = {
  type: "object", additionalProperties: false, required: ["schemaVersion", "planName", "sessions"],
  properties: {
    schemaVersion: { type: "string", const: "workout-ai-draft-v1" }, planName: { type: "string" },
    sessions: { type: "array", minItems: 1, maxItems: 14, items: {
      type: "object", additionalProperties: false, required: ["name", "description", "estimatedDurationMinutes", "sections"],
      properties: {
        name: { type: "string" }, description: nullableString, estimatedDurationMinutes: nullableInteger,
        sections: { type: "array", minItems: 1, maxItems: 20, items: {
          type: "object", additionalProperties: false, required: ["sectionType", "name", "exercises"],
          properties: {
            sectionType: { type: "string", enum: ["WARMUP", "MAIN", "SUPERSET", "CONDITIONING", "COOLDOWN", "CUSTOM"] }, name: nullableString,
            exercises: { type: "array", minItems: 1, maxItems: 50, items: {
              type: "object", additionalProperties: false,
              required: ["exerciseId", "unresolvedExerciseName", "supersetGroupKey", "trainerNote", "studentInstruction", "tempo", "sets"],
              properties: {
                exerciseId: nullableString, unresolvedExerciseName: nullableString, supersetGroupKey: nullableString,
                trainerNote: nullableString, studentInstruction: nullableString, tempo: nullableString,
                sets: { type: "array", minItems: 1, maxItems: 20, items: {
                  type: "object", additionalProperties: false,
                  required: ["setNumber", "setType", "targetReps", "targetRepsMin", "targetRepsMax", "targetLoad", "loadUnit", "durationSeconds", "distanceValue", "distanceUnit", "restSeconds", "targetRpe", "notes"],
                  properties: {
                    setNumber: { type: "integer" }, setType: { type: "string", enum: ["STANDARD", "WARMUP", "DROP", "FAILURE", "AMRAP"] },
                    targetReps: nullableInteger, targetRepsMin: nullableInteger, targetRepsMax: nullableInteger,
                    targetLoad: nullableNumber, loadUnit: { anyOf: [{ type: "string", enum: ["kg", "lb"] }, { type: "null" }] },
                    durationSeconds: nullableInteger, distanceValue: nullableNumber,
                    distanceUnit: { anyOf: [{ type: "string", enum: ["m", "km", "mi"] }, { type: "null" }] },
                    restSeconds: nullableInteger, targetRpe: nullableNumber, notes: nullableString,
                  },
                } },
              },
            } },
          },
        } },
      },
    } },
  },
} as const;

class UnavailableWorkoutAiProvider implements WorkoutAiProvider {
  readonly id = "unavailable";
  status(): WorkoutAiProviderStatus { return { id: this.id, available: false, message: "IA não está disponível neste ambiente." }; }
  async generate(): Promise<WorkoutAiDraftOutput> { throw new Error("workout_ai_provider_unavailable"); }
}

class DemoWorkoutAiProvider implements WorkoutAiProvider {
  readonly id = "demo-deterministic-v1";
  status(): WorkoutAiProviderStatus { return { id: this.id, available: true, message: "Fixture local determinístico para avaliação da experiência." }; }
  async generate(input: { context: WorkoutAiContext; exercises: Exercise[] }) {
    return validateWorkoutAiDraftOutput(workoutDemoAiDraftOutput, new Set(input.exercises.map((exercise) => exercise.id)));
  }
}

class OpenAiWorkoutProvider implements WorkoutAiProvider {
  readonly id: string;
  constructor(private readonly apiKey: string, private readonly model: string, private readonly baseUrl: string, private readonly timeoutMs: number) {
    this.id = `openai:${model}`;
  }
  status(): WorkoutAiProviderStatus { return { id: this.id, available: true, message: "IA disponível para gerar rascunhos revisáveis." }; }

  async generate(input: { context: WorkoutAiContext; exercises: Exercise[] }): Promise<WorkoutAiDraftOutput> {
    const visibleIds = new Set(input.exercises.map((exercise) => exercise.id));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST", signal: controller.signal,
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          response_format: { type: "json_schema", json_schema: { name: "workout_ai_draft_v1", strict: true, schema: workoutDraftJsonSchema } },
          messages: [
            { role: "system", content: [
              "Você auxilia um Personal Trainer a preparar somente um rascunho de treino.",
              "Não diagnostique, não faça alegações médicas e não invente lesões ou condições.",
              "Use exerciseId apenas quando ele existir no catálogo autorizado fornecido.",
              "Para outro exercício, use exerciseId null e unresolvedExerciseName com um nome factual.",
              "Em cada série, use targetReps OU targetRepsMin e targetRepsMax; nunca preencha os três ao mesmo tempo.",
              "Quando usar targetReps, deixe targetRepsMin e targetRepsMax null; quando usar faixa, deixe targetReps null.",
              "Mantenha em null todo campo de prescrição não utilizado e sempre forneça reps, duração ou distância.",
              "Preencha targetLoad e loadUnit juntos ou deixe ambos null; faça o mesmo com distanceValue e distanceUnit.",
              "Use setNumber positivo e único por exercício, targetRpe entre 0 e 10 e valores de reps, duração e descanso não negativos.",
              "Nunca publique; retorne exclusivamente JSON compatível com workout-ai-draft-v1.",
            ].join(" ") },
            { role: "user", content: JSON.stringify({
              context: input.context,
              authorizedExercises: input.exercises.map((exercise) => ({ id: exercise.id, name: exercise.name, primaryMuscleGroup: exercise.primaryMuscleGroup, equipment: exercise.equipment })),
            }) },
          ],
        }),
      });
      if (!response.ok) throw new Error("workout_ai_provider_request_failed");
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string; refusal?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content || payload.choices?.[0]?.message?.refusal) throw new Error("workout_ai_provider_invalid_response");
      return validateWorkoutAiDraftOutput(JSON.parse(content), visibleIds);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("workout_ai_provider_timeout");
      if (error instanceof Error && error.message.startsWith("workout_ai_provider_")) throw error;
      throw new Error("workout_ai_provider_invalid_response");
    } finally { clearTimeout(timeout); }
  }
}

function productionProvider(): WorkoutAiProvider {
  const provider = process.env.WORKOUT_AI_PROVIDER?.trim().toLowerCase() || "openai";
  const apiKey = process.env.WORKOUT_AI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  const model = process.env.WORKOUT_AI_MODEL?.trim();
  const baseUrl = process.env.WORKOUT_AI_BASE_URL?.trim() || "https://api.openai.com/v1";
  const configuredTimeout = Number(process.env.WORKOUT_AI_TIMEOUT_MS ?? 25_000);
  const timeoutMs = Number.isFinite(configuredTimeout) ? Math.min(Math.max(configuredTimeout, 5_000), 60_000) : 25_000;
  try { if (provider !== "openai" || !apiKey || !model || new URL(baseUrl).protocol !== "https:") return new UnavailableWorkoutAiProvider(); }
  catch { return new UnavailableWorkoutAiProvider(); }
  return new OpenAiWorkoutProvider(apiKey, model, baseUrl.replace(/\/$/, ""), timeoutMs);
}

export function getWorkoutAiProvider(demoMode: boolean): WorkoutAiProvider {
  return demoMode ? new DemoWorkoutAiProvider() : productionProvider();
}
