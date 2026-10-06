import { eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { events } from "@/db/schema";

export function createEventSlug(name: string, id: string) {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54) || "event";
  return `${base}-${id.slice(0, 8)}`;
}

export async function backfillEventSlugs() {
  const db = getDb();
  const rows = await db
    .select({ id: events.id, name: events.name })
    .from(events)
    .where(isNull(events.slug));
  for (const row of rows) {
    await db
      .update(events)
      .set({ slug: createEventSlug(row.name, row.id) })
      .where(eq(events.id, row.id));
  }
}
