export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return { url, key, configured: Boolean(url && key) };
}

export function requireSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config.configured || !config.url || !config.key) {
    throw new Error("Supabase não está configurado.");
  }
  return { url: config.url, key: config.key };
}
