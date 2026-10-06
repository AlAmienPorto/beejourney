import { getSupabase } from "@/lib/supabase";
import { supabaseError } from "@/lib/supabase-data";

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

export async function backfillEventSlugs(rows: Array<{ id: string; name: string }>) {
  const supabase = getSupabase();
  await Promise.all(rows.map(async (row) => {
    const { error } = await supabase
      .from("events")
      .update({ slug: createEventSlug(row.name, row.id) })
      .eq("id", row.id)
      .is("slug", null);
    if (error) throw supabaseError("Gagal melengkapi slug event", error);
  }));
}
