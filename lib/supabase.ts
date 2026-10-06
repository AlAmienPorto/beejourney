import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let clientConfig = "";

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.");
  }

  // Reuse the HTTP client inside a warm worker. Database CRUD goes through
  // PostgREST, avoiding a fresh external TCP/Postgres handshake per request.
  const config = `${url}\n${key}`;
  if (!client || clientConfig !== config) {
    client = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    clientConfig = config;
  }

  return client;
}
