import type {
  Exercise,
  StudentPublishedWorkoutSummary,
  WorkoutExercisePrescription,
  WorkoutPlan,
  WorkoutPlanVersion,
  WorkoutSection,
  WorkoutSession,
  WorkoutSetPrescription,
  WorkoutVersionProjection,
} from "@/lib/domain/workouts";
import type { WorkoutAiDraftOutput } from "@/lib/workouts/ai-contract";
import { WORKOUT_AI_SCHEMA_VERSION } from "@/lib/workouts/ai-contract";

const RELATIONSHIPS = {
  juliana: "75000000-0000-4000-8000-000000000001",
  bruno: "75000000-0000-4000-8000-000000000002",
  mariana: "75000000-0000-4000-8000-000000000003",
} as const;

const EXERCISE_IDS = {
  squat: "e4100000-0000-4000-8000-000000000001",
  dumbbellPress: "e4100000-0000-4000-8000-000000000002",
  seatedRow: "e4100000-0000-4000-8000-000000000003",
  romanianDeadlift: "e4100000-0000-4000-8000-000000000004",
  reverseLunge: "e4100000-0000-4000-8000-000000000005",
  latPulldown: "e4100000-0000-4000-8000-000000000006",
  plank: "e4100000-0000-4000-8000-000000000007",
  intervalRun: "e4100000-0000-4000-8000-000000000008",
} as const;

const PRODUCTION_MEDIA_PATHS = new Map<string, string[]>([
  [EXERCISE_IDS.squat, [
    "trainer-public-media/system/exercises/repdb-free-v1/squat-start.webp",
    "trainer-public-media/system/exercises/repdb-free-v1/squat-peak.webp",
  ]],
  [EXERCISE_IDS.dumbbellPress, [
    "trainer-public-media/system/exercises/repdb-free-v1/db-bench-press-start.webp",
    "trainer-public-media/system/exercises/repdb-free-v1/db-bench-press-peak.webp",
  ]],
  [EXERCISE_IDS.romanianDeadlift, [
    "trainer-public-media/system/exercises/repdb-free-v1/romanian-deadlift-start.webp",
    "trainer-public-media/system/exercises/repdb-free-v1/romanian-deadlift-peak.webp",
  ]],
  [EXERCISE_IDS.reverseLunge, [
    "trainer-public-media/system/exercises/repdb-free-v1/reverse-lunge-start.webp",
    "trainer-public-media/system/exercises/repdb-free-v1/reverse-lunge-peak.webp",
  ]],
  [EXERCISE_IDS.latPulldown, [
    "trainer-public-media/system/exercises/repdb-free-v1/lat-pulldown-start.webp",
    "trainer-public-media/system/exercises/repdb-free-v1/lat-pulldown-peak.webp",
  ]],
  [EXERCISE_IDS.plank, [
    "trainer-public-media/system/exercises/repdb-free-v1/plank-main.webp",
  ]],
]);

function exercise(
  id: string,
  name: string,
  primaryMuscleGroup: string,
  equipment: string[],
  movementPattern: string,
  instructions: string,
  coachingCues: string[],
): Exercise {
  const productionMediaPaths = PRODUCTION_MEDIA_PATHS.get(id);
  return {
    id,
    sourceType: "PPERFIL_LIBRARY",
    name,
    description: null,
    primaryMuscleGroup,
    secondaryMuscleGroups: [],
    equipment,
    movementPattern,
    instructions,
    coachingCues,
    locale: "pt-BR",
    media: productionMediaPaths?.map((path, index) => ({
      id: id.replace("e410", index === 0 ? "e420" : "e421"),
      mediaType: "IMAGE" as const,
      urlOrStoragePath: path,
      thumbnailUrlOrPath: path,
      provider: "REPDB_FREE_V1",
      sourceUrl: null,
      licenseType: "RepDB Free Tier License v1.0",
      creatorCredit: "RepDB",
      productionStatus: "APPROVED" as const,
      sortOrder: index,
    })) ?? [],
  };
}

export const workoutDemoExerciseLibrary: Exercise[] = [
  exercise(EXERCISE_IDS.squat, "Agachamento livre", "quadriceps", ["barbell", "rack"], "squat", "Desça com controle e mantenha o tronco estável.", ["Joelhos acompanham os pés", "Pressione o chão"]),
  exercise(EXERCISE_IDS.dumbbellPress, "Supino com halteres", "chest", ["dumbbells", "bench"], "horizontal_push", "Conduza os halteres com amplitude confortável.", ["Escápulas apoiadas", "Punhos neutros"]),
  exercise(EXERCISE_IDS.seatedRow, "Remada baixa", "back", ["cable_machine"], "horizontal_pull", "Puxe o cabo em direção ao tronco sem perder a postura.", ["Peito aberto", "Cotovelos próximos"]),
  exercise(EXERCISE_IDS.romanianDeadlift, "Levantamento terra romeno", "hamstrings", ["barbell"], "hinge", "Leve o quadril para trás mantendo a carga próxima ao corpo.", ["Coluna neutra", "Quadril para trás"]),
  exercise(EXERCISE_IDS.reverseLunge, "Avanço reverso", "glutes", ["bodyweight", "dumbbells"], "lunge", "Dê um passo para trás e desça com controle.", ["Base estável", "Retorne pelo pé da frente"]),
  exercise(EXERCISE_IDS.latPulldown, "Puxada pela frente", "latissimus", ["cable_machine"], "vertical_pull", "Traga a barra até a parte superior do peito.", ["Ombros longe das orelhas", "Controle a volta"]),
  exercise(EXERCISE_IDS.plank, "Prancha frontal", "core", ["bodyweight", "mat"], "anti_extension", "Mantenha tronco, quadril e pernas alinhados.", ["Contraia abdômen", "Respire continuamente"]),
  exercise(EXERCISE_IDS.intervalRun, "Corrida intervalada", "cardiorespiratory", ["treadmill"], "locomotion", "Alterne blocos de esforço e recuperação conforme prescrito.", ["Ritmo sustentável", "Postura relaxada"]),
];

const byId = new Map(workoutDemoExerciseLibrary.map((item) => [item.id, item]));

function set(
  id: string,
  setNumber: number,
  input: Partial<Omit<WorkoutSetPrescription, "id" | "setNumber">> = {},
): WorkoutSetPrescription {
  return {
    id,
    setNumber,
    setType: "STANDARD",
    targetReps: 10,
    targetRepsMin: null,
    targetRepsMax: null,
    targetLoad: null,
    loadUnit: null,
    durationSeconds: null,
    distanceValue: null,
    distanceUnit: null,
    restSeconds: 60,
    targetRpe: 7,
    notes: null,
    ...input,
  };
}

function prescribed(
  id: string,
  exerciseId: string,
  sortOrder: number,
  sets: WorkoutSetPrescription[],
  input: Partial<Omit<WorkoutExercisePrescription, "id" | "exercise" | "sortOrder" | "sets">> = {},
): WorkoutExercisePrescription {
  const selectedExercise = byId.get(exerciseId);
  if (!selectedExercise) throw new Error(`Demo exercise ${exerciseId} is missing.`);
  return {
    id,
    sortOrder,
    supersetGroupKey: null,
    trainerNote: null,
    studentInstruction: null,
    tempo: null,
    exercise: selectedExercise,
    sets,
    ...input,
  };
}

function section(
  id: string,
  sectionType: WorkoutSection["sectionType"],
  name: string | null,
  sortOrder: number,
  exercises: WorkoutExercisePrescription[],
): WorkoutSection {
  return { id, sectionType, name, sortOrder, exercises };
}

function session(
  id: string,
  name: string,
  sortOrder: number,
  sections: WorkoutSection[],
  description: string | null = null,
): WorkoutSession {
  return { id, name, description, estimatedDurationMinutes: 50, sortOrder, sections };
}

function plan(id: string, relationshipId: string, name: string, goal: string): WorkoutPlan {
  return {
    id,
    trainerStudentRelationshipId: relationshipId,
    name,
    goal,
    status: "ACTIVE",
    createdAt: "2026-08-03T12:00:00.000Z",
    updatedAt: "2026-08-22T18:00:00.000Z",
  };
}

function version(
  id: string,
  workoutPlanId: string,
  versionNumber: number,
  status: WorkoutPlanVersion["status"],
  sourceType: NonNullable<WorkoutPlanVersion["sourceType"]>,
  input: Partial<WorkoutPlanVersion> = {},
): WorkoutPlanVersion {
  return {
    id,
    workoutPlanId,
    versionNumber,
    status,
    sourceType,
    sourceAssessmentId: null,
    sourceVersionId: null,
    trainerPrompt: null,
    generationMetadata: {},
    approvedAt: status === "DRAFT" ? null : "2026-08-20T14:00:00.000Z",
    publishedAt: status === "PUBLISHED" || status === "ARCHIVED" ? "2026-08-20T15:00:00.000Z" : null,
    archivedAt: status === "ARCHIVED" ? "2026-08-22T15:00:00.000Z" : null,
    createdAt: "2026-08-18T12:00:00.000Z",
    ...input,
  };
}

const PLAN_IDS = {
  manual: "f4100000-0000-4000-8000-000000000001",
  ai: "f4100000-0000-4000-8000-000000000002",
  approved: "f4100000-0000-4000-8000-000000000003",
  published: "f4100000-0000-4000-8000-000000000004",
} as const;

const VERSION_IDS = {
  manual: "f4200000-0000-4000-8000-000000000001",
  ai: "f4200000-0000-4000-8000-000000000002",
  approved: "f4200000-0000-4000-8000-000000000003",
  archived: "f4200000-0000-4000-8000-000000000004",
  published: "f4200000-0000-4000-8000-000000000005",
} as const;

function lowerSession(prefix: string): WorkoutSession {
  return session(
    `${prefix}1000-0000-4000-8000-000000000001`,
    "Inferiores",
    0,
    [section(
      `${prefix}2000-0000-4000-8000-000000000001`,
      "MAIN",
      "Bloco principal",
      0,
      [
        prescribed(`${prefix}3000-0000-4000-8000-000000000001`, EXERCISE_IDS.squat, 0, [
          set(`${prefix}4000-0000-4000-8000-000000000001`, 1, { targetReps: 8, targetLoad: 30, loadUnit: "kg", restSeconds: 90 }),
          set(`${prefix}4000-0000-4000-8000-000000000002`, 2, { targetReps: 8, targetLoad: 30, loadUnit: "kg", restSeconds: 90 }),
          set(`${prefix}4000-0000-4000-8000-000000000003`, 3, { targetReps: 8, targetLoad: 30, loadUnit: "kg", restSeconds: 90 }),
        ], { trainerNote: "Observar estabilidade do joelho.", studentInstruction: "Mantenha o movimento controlado." }),
        prescribed(`${prefix}3000-0000-4000-8000-000000000002`, EXERCISE_IDS.romanianDeadlift, 1, [
          set(`${prefix}4000-0000-4000-8000-000000000004`, 1, { targetRepsMin: 8, targetRepsMax: 10, targetReps: null, targetLoad: 35, loadUnit: "kg", restSeconds: 90 }),
          set(`${prefix}4000-0000-4000-8000-000000000005`, 2, { targetRepsMin: 8, targetRepsMax: 10, targetReps: null, targetLoad: 35, loadUnit: "kg", restSeconds: 90 }),
        ]),
      ],
    )],
    "Força e controle de membros inferiores.",
  );
}

function upperSession(prefix: string): WorkoutSession {
  return session(
    `${prefix}1000-0000-4000-8000-000000000002`,
    "Superiores",
    1,
    [
      section(`${prefix}2000-0000-4000-8000-000000000002`, "SUPERSET", "Empurrar + puxar", 0, [
        prescribed(`${prefix}3000-0000-4000-8000-000000000003`, EXERCISE_IDS.dumbbellPress, 0, [
          set(`${prefix}4000-0000-4000-8000-000000000006`, 1, { targetReps: 10, targetLoad: 8, loadUnit: "kg", restSeconds: 30 }),
          set(`${prefix}4000-0000-4000-8000-000000000007`, 2, { targetReps: 10, targetLoad: 8, loadUnit: "kg", restSeconds: 30 }),
        ], { supersetGroupKey: "A" }),
        prescribed(`${prefix}3000-0000-4000-8000-000000000004`, EXERCISE_IDS.seatedRow, 1, [
          set(`${prefix}4000-0000-4000-8000-000000000008`, 1, { targetReps: 10, targetLoad: 20, loadUnit: "kg", restSeconds: 75 }),
          set(`${prefix}4000-0000-4000-8000-000000000009`, 2, { targetReps: 10, targetLoad: 20, loadUnit: "kg", restSeconds: 75 }),
        ], { supersetGroupKey: "A" }),
      ]),
      section(`${prefix}2000-0000-4000-8000-000000000003`, "COOLDOWN", "Finalização", 1, [
        prescribed(`${prefix}3000-0000-4000-8000-000000000005`, EXERCISE_IDS.plank, 0, [
          set(`${prefix}4000-0000-4000-8000-00000000000a`, 1, { targetReps: null, durationSeconds: 30, restSeconds: 30 }),
          set(`${prefix}4000-0000-4000-8000-00000000000b`, 2, { targetReps: null, durationSeconds: 30, restSeconds: 30 }),
        ]),
      ]),
    ],
    "Força de membros superiores e estabilidade.",
  );
}

function recoverySession(prefix: string): WorkoutSession {
  return session(
    `${prefix}1000-0000-4000-8000-000000000003`,
    "Mobilidade e estabilidade",
    2,
    [section(`${prefix}2000-0000-4000-8000-000000000004`, "COOLDOWN", "Recuperação ativa", 0, [
      prescribed(`${prefix}3000-0000-4000-8000-000000000006`, EXERCISE_IDS.reverseLunge, 0, [
        set(`${prefix}4000-0000-4000-8000-00000000000c`, 1, { targetReps: 8, targetLoad: null, loadUnit: null, restSeconds: 45 }),
        set(`${prefix}4000-0000-4000-8000-00000000000d`, 2, { targetReps: 8, targetLoad: null, loadUnit: null, restSeconds: 45 }),
      ], { studentInstruction: "Priorize amplitude confortável e controle." }),
    ])],
    "Sessão breve disponível, sem agenda fictícia.",
  );
}

export const workoutDemoVersions: WorkoutVersionProjection[] = [
  {
    plan: plan(PLAN_IDS.manual, RELATIONSHIPS.juliana, "Base de força", "Ganhar força com técnica consistente"),
    version: version(VERSION_IDS.manual, PLAN_IDS.manual, 1, "DRAFT", "MANUAL"),
    sessions: [lowerSession("a410")],
  },
  {
    plan: plan(PLAN_IDS.ai, RELATIONSHIPS.bruno, "Condicionamento 3x", "Aumentar condicionamento geral"),
    version: version(VERSION_IDS.ai, PLAN_IDS.ai, 1, "DRAFT", "AI_DRAFT", {
      sourceAssessmentId: "d3100000-0000-4000-8000-000000000004",
      trainerPrompt: "Criar uma base de três dias com progressão conservadora.",
      generationMetadata: { schema_version: WORKOUT_AI_SCHEMA_VERSION, provider: "LOCAL_FIXTURE_ONLY" },
    }),
    sessions: [upperSession("b410")],
  },
  {
    plan: plan(PLAN_IDS.approved, RELATIONSHIPS.mariana, "Retorno progressivo", "Retomar consistência sem elevar o volume rapidamente"),
    version: version(VERSION_IDS.approved, PLAN_IDS.approved, 1, "APPROVED", "MANUAL"),
    sessions: [lowerSession("c410")],
  },
  {
    plan: plan(PLAN_IDS.published, RELATIONSHIPS.juliana, "Hipertrofia 4x", "Evoluir volume e força com quatro estímulos semanais"),
    version: version(VERSION_IDS.archived, PLAN_IDS.published, 1, "ARCHIVED", "MANUAL"),
    sessions: [lowerSession("d410")],
  },
  {
    plan: plan(PLAN_IDS.published, RELATIONSHIPS.juliana, "Hipertrofia 4x", "Evoluir volume e força com quatro estímulos semanais"),
    version: version(VERSION_IDS.published, PLAN_IDS.published, 2, "PUBLISHED", "MANUAL", { sourceVersionId: VERSION_IDS.archived }),
    sessions: [lowerSession("e410"), upperSession("f410"), recoverySession("g410")],
  },
];

export const workoutDemoStudentPublished: StudentPublishedWorkoutSummary[] = [
  {
    id: VERSION_IDS.published,
    workoutPlanId: PLAN_IDS.published,
    planName: "Hipertrofia 4x",
    goal: "Evoluir volume e força com quatro estímulos semanais",
    versionNumber: 2,
    status: "PUBLISHED",
    publishedAt: "2026-08-20T15:00:00.000Z",
    archivedAt: null,
  },
  {
    id: VERSION_IDS.archived,
    workoutPlanId: PLAN_IDS.published,
    planName: "Hipertrofia 4x",
    goal: "Evoluir volume e força com quatro estímulos semanais",
    versionNumber: 1,
    status: "ARCHIVED",
    publishedAt: "2026-08-10T15:00:00.000Z",
    archivedAt: "2026-08-20T15:00:00.000Z",
  },
];

export const workoutDemoAiDraftOutput: WorkoutAiDraftOutput = {
  schemaVersion: WORKOUT_AI_SCHEMA_VERSION,
  planName: "Condicionamento 3x",
  sessions: [{
    name: "Circuito A",
    description: "Draft local para validação humana do Personal.",
    estimatedDurationMinutes: 40,
    sections: [{
      sectionType: "CONDITIONING",
      name: "Bloco intervalado",
      exercises: [{
        exerciseId: EXERCISE_IDS.intervalRun,
        unresolvedExerciseName: null,
        supersetGroupKey: null,
        trainerNote: "Confirmar intensidade antes de aprovar.",
        studentInstruction: "Alterne esforço e recuperação conforme orientação.",
        tempo: null,
        sets: [{
          setNumber: 1,
          setType: "STANDARD",
          targetReps: null,
          targetRepsMin: null,
          targetRepsMax: null,
          targetLoad: null,
          loadUnit: null,
          durationSeconds: 600,
          distanceValue: null,
          distanceUnit: null,
          restSeconds: 120,
          targetRpe: 7,
          notes: "Não é publicado automaticamente.",
        }],
      }],
    }],
  }],
};
