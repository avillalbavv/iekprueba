import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const runtimeEnv =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const url = runtimeEnv.VITE_SUPABASE_URL?.trim();
const anonKey = runtimeEnv.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes("TU-PROYECTO") && !anonKey.includes("TU_CLAVE"),
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "iek-auth-session-v1",
      },
    })
  : null;
