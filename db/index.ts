import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function getDb() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error("SUPABASE_DB_URL is missing. Please set it in .env or dashboard.");
  }

  // Cloudflare Workers requires TCP sockets to be scoped per-request.
  // We use Supabase's transaction pooler port (6543) so fast reconnects are lightweight.
  const client = postgres(process.env.SUPABASE_DB_URL, { prepare: false });
  return drizzle(client, { schema });
}
