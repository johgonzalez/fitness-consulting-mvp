import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(here, "../../data/exercises/media-pack-v1.json"), "utf8"));
const urlIndex = process.argv.indexOf("--supabase-url");
const configuredUrl = (urlIndex >= 0 ? process.argv[urlIndex + 1] : process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim().replace(/\/$/, "");
if (!configuredUrl) throw new Error("Provide --supabase-url or NEXT_PUBLIC_SUPABASE_URL.");
const baseUrl = new URL(configuredUrl);
if (baseUrl.protocol !== "https:") throw new Error("The Supabase URL must use HTTPS.");

const assets = manifest.mappings.flatMap((mapping) => mapping.assets.map((asset) => ({
  exercise: mapping.pperfilName,
  ...asset,
})));

function publicUrl(storagePath) {
  const [bucket, ...objectPath] = storagePath.split("/");
  return `${baseUrl.origin}/storage/v1/object/public/${bucket}/${objectPath.map(encodeURIComponent).join("/")}`;
}

async function verify(asset) {
  const response = await fetch(publicUrl(asset.storagePath), { redirect: "error" });
  if (!response.ok) throw new Error(`${asset.exercise}/${asset.role}: HTTP ${response.status}`);
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim();
  if (contentType !== "image/webp") throw new Error(`${asset.exercise}/${asset.role}: unexpected content-type ${contentType ?? "missing"}`);
  const cacheControl = response.headers.get("cache-control") ?? "";
  if (!cacheControl.includes("public") || !cacheControl.includes("max-age=31536000")) {
    throw new Error(`${asset.exercise}/${asset.role}: unexpected cache-control ${cacheControl || "missing"}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const checksum = createHash("sha256").update(bytes).digest("hex");
  if (bytes.length !== asset.byteSize) throw new Error(`${asset.exercise}/${asset.role}: expected ${asset.byteSize} bytes, received ${bytes.length}`);
  if (checksum !== asset.sha256) throw new Error(`${asset.exercise}/${asset.role}: SHA-256 mismatch`);
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error(`${asset.exercise}/${asset.role}: invalid WebP signature`);
  }
  return bytes.length;
}

const failures = [];
let verifiedBytes = 0;
for (let index = 0; index < assets.length; index += 8) {
  const batch = assets.slice(index, index + 8);
  const results = await Promise.allSettled(batch.map(verify));
  results.forEach((result) => {
    if (result.status === "fulfilled") verifiedBytes += result.value;
    else failures.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
  });
}
if (failures.length) throw new Error(`Remote media verification failed:\n- ${failures.join("\n- ")}`);
process.stdout.write(`${JSON.stringify({
  status: "PASS",
  storageOrigin: baseUrl.origin,
  mappedExercises: manifest.mappedExerciseCount,
  verifiedAssets: assets.length,
  verifiedBytes,
}, null, 2)}\n`);
