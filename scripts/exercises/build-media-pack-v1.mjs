import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const catalogPath = resolve(repoRoot, "data/exercises/catalog-v1.json");
const manifestPath = resolve(repoRoot, "data/exercises/media-pack-v1.json");

const SOURCE_COMMIT = "045845b61e4aefd9e684fa84518b84c665ea3cd3";
const SOURCE_COUNT = 250;
const SOURCE_REPOSITORY = "https://github.com/RepDB/exercise-dataset";
const LICENSE_SHA256 = "8f736a4d3cc1aca05c25fdba69fb131d927a187ae5b3a6b370876d8de013abc9";
const ATTRIBUTION_SHA256 = "baa24a7c685d308ccfe28fe2fccbf12403ad6537d56c0b6189c4bcb0268f38b4";
const DATASET_SHA256 = "03d8061189448f78ee05dbea3e65f98501fc4486340f86f6e78eaacd89cfa7ec";
const MEDIA_NAMESPACE = "c12488fa-9b2a-4c84-b142-6cb6af81ae40";
const STORAGE_BUCKET = "trainer-public-media";
const STORAGE_PREFIX = "system/exercises/repdb-free-v1";

const mappings = [
  ["agachamento-livre", "squat", "Exact movement and barbell equipment match."],
  ["leg-press-45", "leg-press", "RepDB free-tier asset depicts the common sled leg press used by this machine record."],
  ["leg-press-horizontal", "horizontal-leg-press", "Exact horizontal machine movement match."],
  ["cadeira-extensora", "leg-extension", "Exact machine knee-extension match."],
  ["mesa-flexora", "leg-curl", "Exact lying leg-curl match."],
  ["levantamento-terra-romeno", "romanian-deadlift", "Exact movement and barbell equipment match."],
  ["terra-romeno-com-halteres", "dumbbell-romanian-deadlift", "Exact movement and dumbbell equipment match."],
  ["hip-thrust", "hip-thrust", "Exact barbell hip-thrust match."],
  ["afundo", "lunge", "Exact bodyweight lunge match."],
  ["avanco-reverso-com-halteres", "reverse-lunge", "Exact reverse-lunge and dumbbell match."],
  ["agachamento-bulgaro", "bulgarian-split-squat", "Exact Bulgarian split-squat and dumbbell match."],
  ["panturrilha-em-pe", "standing-calf-raise", "Exact standing calf machine match."],
  ["panturrilha-sentada", "seated-calf-raise", "Exact seated calf machine match."],
  ["ponte-de-gluteos", "glute-bridge", "Exact bodyweight glute-bridge match."],
  ["levantamento-terra-sumo", "sumo-deadlift", "Exact movement and barbell equipment match."],
  ["supino-reto-com-barra", "bench-press", "Exact flat barbell bench-press match."],
  ["supino-com-halteres", "db-bench-press", "Exact flat dumbbell bench-press match."],
  ["supino-inclinado-com-barra", "incline-bench-press", "Exact incline barbell bench-press match."],
  ["supino-inclinado-com-halteres", "incline-db-press", "Exact incline dumbbell press match."],
  ["crucifixo-com-halteres", "db-fly", "Exact dumbbell fly match."],
  ["crucifixo-no-cabo", "cable-fly", "Exact cable fly match."],
  ["flexao-de-braco", "push-up", "Exact standard push-up match."],
  ["puxada-frontal", "lat-pulldown", "Exact cable lat-pulldown match."],
  ["barra-fixa-assistida", "assisted-pull-ups", "Exact assisted pull-up machine match."],
  ["barra-fixa", "pull-up", "Exact pronated pull-up match."],
  ["chin-up", "chin-ups", "Exact supinated chin-up match."],
  ["remada-curvada", "barbell-row", "Exact bent-over barbell row match."],
  ["remada-unilateral", "single-arm-db-row", "Exact single-arm dumbbell row match."],
  ["remada-apoiada-no-banco", "chest-supported-db-row", "Exact chest-supported dumbbell row match."],
  ["remada-invertida", "inverted-row", "Exact inverted-row match."],
  ["desenvolvimento-com-halteres", "dumbbell-shoulder-press", "Exact dumbbell shoulder-press match."],
  ["desenvolvimento-militar", "ohp", "Exact barbell overhead-press match."],
  ["elevacao-lateral", "lateral-raise", "Exact dumbbell lateral-raise match."],
  ["elevacao-frontal", "dumbbell-front-raise", "Exact dumbbell front-raise match."],
  ["face-pull", "face-pull", "Exact cable face-pull match."],
  ["rosca-direta", "barbell-curl", "Exact barbell curl match."],
  ["rosca-martelo", "hammer-curl", "Exact dumbbell hammer-curl match."],
  ["rosca-concentrada", "concentration-curl", "Exact dumbbell concentration-curl match."],
  ["rosca-scott", "preacher-curl", "Exact preacher-curl pattern and supported-bar setup match."],
  ["triceps-na-polia", "tricep-pushdown", "Exact cable triceps-pushdown match."],
  ["triceps-frances", "overhead-tricep-extension", "Exact dumbbell overhead triceps-extension match."],
  ["triceps-testa", "skull-crusher", "Exact barbell skull-crusher match."],
  ["supino-fechado", "close-grip-bench-press", "Exact close-grip barbell bench-press match."],
  ["prancha", "plank", "Exact forearm plank match."],
  ["abdominal", "crunches", "Exact standard bodyweight crunch match."],
  ["dead-bug", "dead-bug", "Exact dead-bug match."],
  ["mountain-climber", "mountain-climbers", "Exact mountain-climber match."],
  ["polichinelo", "jumping-jacks", "Exact jumping-jack match."],
  ["mobilidade-de-ombro", "banded-shoulder-stretch", "High-confidence resistance-band shoulder mobility match."],
];

const skippedPriority = [
  { pperfilName: "Agachamento goblet", reason: "Free-tier RepDB asset uses a kettlebell while the PPerfil V1 record specifies a dumbbell." },
  { pperfilName: "Remada baixa", reason: "Only a wide-grip seated cable-row asset is available; grip-specific guidance would overstate the generic PPerfil record." },
  { pperfilName: "Rosca alternada", reason: "The free-tier dumbbell curl asset does not establish alternating-arm execution." },
  { pperfilName: "Pallof press", reason: "No semantically equivalent free-tier RepDB exercise exists in the pinned snapshot." },
  { pperfilName: "Burpee", reason: "The pinned free-tier asset contains only the bottom pose and does not safely communicate the complete dynamic movement." },
  { pperfilName: "Mobilidade de quadril", reason: "Only movement-specific hip stretches exist; none safely represents the generic PPerfil mobility record." },
];

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function uuidBytes(value) {
  return Buffer.from(value.replaceAll("-", ""), "hex");
}

function uuidV5(name, namespace) {
  const digest = createHash("sha1").update(Buffer.concat([uuidBytes(namespace), Buffer.from(name)])).digest();
  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = digest.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function webpDimensions(buffer, assetPath) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error(`Asset is not a WebP file: ${assetPath}`);
  }
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (chunk === "VP8L") {
    if (buffer[20] !== 0x2f) throw new Error(`Invalid lossless WebP header: ${assetPath}`);
    return {
      width: 1 + buffer[21] + ((buffer[22] & 0x3f) << 8),
      height: 1 + (buffer[22] >> 6) + (buffer[23] << 2) + ((buffer[24] & 0x0f) << 10),
    };
  }
  if (chunk === "VP8 ") {
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) throw new Error(`Invalid lossy WebP header: ${assetPath}`);
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  throw new Error(`Unsupported WebP chunk ${chunk}: ${assetPath}`);
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const sourceDir = argument("--source-dir");
if (!sourceDir) throw new Error("Use --source-dir with a clean checkout of RepDB/exercise-dataset.");
const stageDir = argument("--stage-dir");
const sourceRoot = resolve(sourceDir);

const sourceCommit = execFileSync("git", ["-C", sourceRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (sourceCommit !== SOURCE_COMMIT) throw new Error(`RepDB commit mismatch: expected ${SOURCE_COMMIT}, received ${sourceCommit}.`);
if (execFileSync("git", ["-C", sourceRoot, "status", "--porcelain"], { encoding: "utf8" }).trim()) throw new Error("RepDB source checkout must be clean.");

const licenseBuffer = readFileSync(resolve(sourceRoot, "LICENSE-DATA.md"));
const attributionBuffer = readFileSync(resolve(sourceRoot, "ATTRIBUTION.md"));
const datasetBuffer = readFileSync(resolve(sourceRoot, "exercises.json"));
if (sha256(licenseBuffer) !== LICENSE_SHA256) throw new Error("Pinned RepDB license file hash changed.");
if (sha256(attributionBuffer) !== ATTRIBUTION_SHA256) throw new Error("Pinned RepDB attribution file hash changed.");
if (sha256(datasetBuffer) !== DATASET_SHA256) throw new Error("Pinned RepDB dataset file hash changed.");

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const source = JSON.parse(datasetBuffer);
if (source.count !== SOURCE_COUNT || source.exercises.length !== SOURCE_COUNT) throw new Error("Unexpected RepDB free-tier dataset size.");
const pperfilBySlug = new Map(catalog.exercises.map((exercise) => [exercise.slug, exercise]));
const repdbById = new Map(source.exercises.map((exercise) => [exercise.id, exercise]));
const seenPPerfil = new Set();
const seenRepDB = new Set();

const generatedMappings = mappings.map(([pperfilSlug, repdbId, matchingRationale]) => {
  const pperfil = pperfilBySlug.get(pperfilSlug);
  const repdb = repdbById.get(repdbId);
  if (!pperfil) throw new Error(`Unknown PPerfil exercise slug: ${pperfilSlug}`);
  if (!repdb) throw new Error(`Unknown RepDB free-tier exercise: ${repdbId}`);
  if (pperfil.sourceType !== "PPERFIL_LIBRARY") throw new Error(`PPerfil exercise is not system-owned: ${pperfilSlug}`);
  if (seenPPerfil.has(pperfil.id)) throw new Error(`Duplicate PPerfil mapping: ${pperfilSlug}`);
  if (seenRepDB.has(repdbId)) throw new Error(`Duplicate RepDB mapping: ${repdbId}`);
  seenPPerfil.add(pperfil.id);
  seenRepDB.add(repdbId);

  const roles = ["main", "start", "peak"].filter((role) => repdb.images?.flat?.[role]);
  if (!roles.length || (roles.includes("main") && roles.length !== 1)) throw new Error(`Unexpected image roles for ${repdbId}.`);
  const assets = roles.map((role, sortOrder) => {
    const sourcePath = repdb.images.flat[role];
    if (!sourcePath.startsWith("images/flat/") || sourcePath.includes("..") || sourcePath.includes("premium-samples")) {
      throw new Error(`Forbidden RepDB asset path: ${sourcePath}`);
    }
    const absolutePath = resolve(sourceRoot, sourcePath);
    const buffer = readFileSync(absolutePath);
    const dimensions = webpDimensions(buffer, sourcePath);
    if (dimensions.width !== 512 || dimensions.height !== 512) throw new Error(`Unexpected dimensions for ${sourcePath}.`);
    if (statSync(absolutePath).size < 2_000 || statSync(absolutePath).size > 250_000) throw new Error(`Unexpected file size for ${sourcePath}.`);
    const storageObject = `${STORAGE_PREFIX}/${basename(sourcePath)}`;
    if (stageDir) {
      const destination = resolve(stageDir, basename(sourcePath));
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(absolutePath, destination);
    }
    return {
      id: uuidV5(`${pperfil.id}:${repdbId}:${role}`, MEDIA_NAMESPACE),
      role,
      sortOrder,
      sourcePath,
      storagePath: `${STORAGE_BUCKET}/${storageObject}`,
      sha256: sha256(buffer),
      byteSize: buffer.length,
      width: dimensions.width,
      height: dimensions.height,
    };
  });

  return {
    pperfilExerciseId: pperfil.id,
    pperfilSlug,
    pperfilName: pperfil.name,
    repdbId,
    repdbName: repdb.name_en,
    matchingConfidence: "HIGH",
    matchingRationale,
    sourceUrl: `https://exercise-dataset.com/exercise/${repdbId}/`,
    assets,
  };
});

const assetCount = generatedMappings.reduce((total, mapping) => total + mapping.assets.length, 0);
if (generatedMappings.length !== 49) throw new Error(`Media Pack V1 must map exactly 49 exercises, received ${generatedMappings.length}.`);
if (assetCount < 50 || assetCount > 100) throw new Error(`Unexpected Media Pack V1 record count: ${assetCount}.`);

const manifest = {
  schemaVersion: "pperfil-exercise-media-pack-v1",
  packVersion: "1.0.0",
  generatedAt: "2026-08-23T00:00:00.000Z",
  provider: "RepDB Free",
  source: {
    repository: SOURCE_REPOSITORY,
    commit: SOURCE_COMMIT,
    datasetCount: SOURCE_COUNT,
    datasetSha256: DATASET_SHA256,
    license: "RepDB Free Tier License v1.0",
    licenseUrl: `${SOURCE_REPOSITORY}/blob/${SOURCE_COMMIT}/LICENSE-DATA.md`,
    licenseSha256: LICENSE_SHA256,
    attributionUrl: `${SOURCE_REPOSITORY}/blob/${SOURCE_COMMIT}/ATTRIBUTION.md`,
    attributionSha256: ATTRIBUTION_SHA256,
    attributionText: "Exercise data by RepDB (repdb.co)",
    commercialInAppUse: true,
    redistributionAsDataset: false,
    generativeAiUse: false,
    premiumSamplesAllowed: false,
  },
  storage: {
    bucket: STORAGE_BUCKET,
    prefix: STORAGE_PREFIX,
    public: true,
    cacheControl: "public, max-age=31536000, immutable",
  },
  database: {
    mediaType: "IMAGE",
    provider: "REPDB_FREE_V1",
    licenseType: "RepDB Free Tier License v1.0",
    creatorCredit: "RepDB",
    productionStatus: "APPROVED",
  },
  mappedExerciseCount: generatedMappings.length,
  mediaRecordCount: assetCount,
  skippedPriority,
  mappings: generatedMappings,
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  manifestPath,
  mappedExerciseCount: generatedMappings.length,
  mediaRecordCount: assetCount,
  skippedPriorityCount: skippedPriority.length,
  staged: Boolean(stageDir),
  stageDir: stageDir ? resolve(stageDir) : null,
  manifestSha256: sha256(readFileSync(manifestPath)),
}, null, 2)}\n`);
