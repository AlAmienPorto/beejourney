import { requireAdminApi } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";
import { supabaseError } from "@/lib/supabase-data";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  try {
    const { id } = await context.params;
    const supabase = getSupabase();
    const participant = await supabase
      .from("participants")
      .select("payment_key,payment_name")
      .eq("id", id)
      .maybeSingle();
    if (participant.error) throw supabaseError("Gagal mencari bukti transfer", participant.error);
    if (!participant.data) return new Response("Bukti transfer tidak ditemukan", { status: 404 });

    const signed = await supabase.storage
      .from("payments")
      .createSignedUrl(participant.data.payment_key, 5 * 60, { download: false });
    if (signed.error || !signed.data) return new Response("Bukti transfer tidak ditemukan", { status: 404 });

    return new Response(null, {
      status: 307,
      headers: {
        Location: signed.data.signedUrl,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Failed to load payment proof", error);
    return new Response("Bukti transfer belum dapat dimuat", { status: 500 });
  }
}
