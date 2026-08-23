import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(here, "../../data/exercises/media-pack-v1.json"), "utf8"));
const stageIndex = process.argv.indexOf("--stage-dir");
const urlIndex = process.argv.indexOf("--supabase-url");
const stageDir = stageIndex >= 0 ? resolve(process.argv[stageIndex + 1]) : null;
const configuredUrl = (urlIndex >= 0 ? process.argv[urlIndex + 1] : process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim().replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!stageDir) throw new Error("Provide --stage-dir with the verified temporary media directory.");
if (!configuredUrl) throw new Error("Provide --supabase-url or NEXT_PUBLIC_SUPABASE_URL.");
if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required in process memory; never store it in the repository.");
const baseUrl = new URL(configuredUrl);
if (baseUrl.protocol !== "https:") throw new Error("The Supabase URL must use HTTPS.");

const assets = manifest.mappings.flatMap((mapping) => mapping.assets);
const expectedByName = new Map(assets.map((asset) => [basename(asset.storagePath), asset]));
const stagedFiles = readdirSync(stageDir, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
if (stagedFiles.length !== assets.length || stagedFiles.some((name) => !expectedByName.has(name))) {
  throw new Error(`Staging directory must contain exactly the ${assets.length} manifest assets.`);
}
for (const fileName of stagedFiles) {
  const asset = expectedByName.get(fileName);
  const bytes = readFileSync(resolve(stageDir, fileName));
  if (bytes.length !== asset.byteSize || createHash("sha256").update(bytes).digest("hex") !== asset.sha256) {
    throw new Error(`Staged asset integrity mismatch: ${fileName}`);
  }
}

const client = createClient(baseUrl.origin, serviceRoleKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});
const bucket = client.storage.from(manifest.storage.bucket);
const { data: existing, error: listError } = await bucket.list(manifest.storage.prefix, { limit: 1000, sortBy: { column: "name", order: "asc" } });
if (listError) throw new Error(`Unable to inspect the controlled storage prefix: ${listError.message}`);
const existingNames = new Set((existing ?? []).filter((item) => item.id).map((item) => item.name));
const unexpected = [...existingNames].filter((name) => !expectedByName.has(name));
if (unexpected.length) throw new Error(`Controlled prefix contains unexpected objects: ${unexpected.join(", ")}`);

let uploaded = 0;
let skipped = 0;
const failures = [];
for (let index = 0; index < stagedFiles.length; index += 6) {
  const batch = stagedFiles.slice(index, index + 6);
  await Promise.all(batch.map(async (fileName) => {
    if (existingNames.has(fileName)) {
      skipped += 1;
      return;
    }
    const objectPath = `${manifest.storage.prefix}/${fileName}`;
    const { error } = await bucket.upload(objectPath, readFileSync(resolve(stageDir, fileName)), {
      cacheControl: "31536000",
      contentType: "image/webp",
      upsert: false,
    });
    if (error) failures.push(`${fileName}: ${error.message}`);
    else uploaded += 1;
  }));
}
if (failures.length) throw new Error(`Storage upload failed:\n- ${failures.join("\n- ")}`);

const { data: finalObjects, error: finalListError } = await bucket.list(manifest.storage.prefix, { limit: 1000 });
if (finalListError) throw new Error(`Unable to verify the controlled storage prefix: ${finalListError.message}`);
const finalNames = new Set((finalObjects ?? []).filter((item) => item.id).map((item) => item.name));
if (finalNames.size !== assets.length || stagedFiles.some((name) => !finalNames.has(name))) {
  throw new Error(`Storage prefix verification expected ${assets.length} objects, received ${finalNames.size}.`);
}
process.stdout.write(`${JSON.stringify({
  status: "PASS",
  storageOrigin: baseUrl.origin,
  bucket: manifest.storage.bucket,
  prefix: manifest.storage.prefix,
  uploaded,
  skipped,
  verifiedObjectNames: finalNames.size,
}, null, 2)}\n`);
