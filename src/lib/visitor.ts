import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "pperfil_visitor";
export async function getVisitorHash() {
  const store = await cookies();
  let value = store.get(COOKIE)?.value;
  if (!value || !/^[0-9a-f-]{36}$/.test(value)) {
    value = randomUUID();
    store.set(COOKIE, value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 180, path: "/" });
  }
  return createHash("sha256").update(value).digest("hex");
}
