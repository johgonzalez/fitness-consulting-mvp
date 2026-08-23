const paths = [
  "/images/saas/auth-trainer-03.webp",
  "/images/motion/thiago-coaching.png",
  "/images/motion/thiago-lateral-bound.png",
  "/images/motion/thiago-motion-hero.png",
  "/images/saas/auth-trainer.webp",
] as const;

export const demoWorkoutMediaRegistry = new Map<string, string>([
  ["e4100000-0000-4000-8000-000000000001", paths[0]],
  ["e4100000-0000-4000-8000-000000000002", paths[1]],
  ["e4100000-0000-4000-8000-000000000003", paths[2]],
  ["e4100000-0000-4000-8000-000000000004", paths[3]],
  ["e4100000-0000-4000-8000-000000000005", paths[4]],
  ["e4100000-0000-4000-8000-000000000006", paths[1]],
  ["e4100000-0000-4000-8000-000000000007", paths[4]],
  ["e4100000-0000-4000-8000-000000000008", paths[3]],
]);

export function resolveDemoWorkoutStoragePath(storagePath: string) {
  const exerciseId = storagePath.match(/(e410[0-9a-f-]{32})/i)?.[1];
  return exerciseId ? demoWorkoutMediaRegistry.get(exerciseId) ?? null : null;
}
