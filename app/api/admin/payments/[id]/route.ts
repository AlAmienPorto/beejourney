import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { participants } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  try {
    const { id } = await context.params;
    const db = getDb();
    const [participant] = await db
      .select({
        paymentKey: participants.paymentKey,
        paymentName: participants.paymentName,
        paymentType: participants.paymentType,
      })
      .from(participants)
      .where(eq(participants.id, id))
      .limit(1);
    if (!participant) return new Response("Bukti transfer tidak ditemukan", { status: 404 });

    const supabase = getSupabase();
    const { data, error } = await supabase.storage.from("payments").download(participant.paymentKey);
    
    if (error || !data) {
      console.error("Supabase Storage Error:", error);
      return new Response("Bukti transfer tidak ditemukan", { status: 404 });
    }

    return new Response(data, {
      headers: {
        "Content-Type": participant.paymentType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(participant.paymentName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Failed to load payment proof", error);
    return new Response("Bukti transfer belum dapat dimuat", { status: 500 });
  }
}
