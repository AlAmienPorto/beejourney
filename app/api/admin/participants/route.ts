import { requireAdminApi } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";
import { mapParticipant, PARTICIPANT_COLUMNS, supabaseError } from "@/lib/supabase-data";

const PAYMENT_URL_TTL_SECONDS = 10 * 60;

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  try {
    const eventId = new URL(request.url).searchParams.get("eventId")?.trim();
    if (!eventId) return Response.json({ error: "Event wajib dipilih." }, { status: 400 });
    const supabase = getSupabase();
    const query = await supabase
      .from("participants")
      .select(PARTICIPANT_COLUMNS)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    if (query.error) throw supabaseError("Gagal memuat peserta", query.error);
    const rows = (query.data ?? []).map(mapParticipant);

    const paths = rows.map((row) => row.paymentKey);
    const signedByPath = new Map<string, string>();
    if (paths.length > 0) {
      const signed = await supabase.storage.from("payments").createSignedUrls(paths, PAYMENT_URL_TTL_SECONDS);
      if (signed.error) {
        console.error("Failed to sign payment proof URLs", signed.error);
      } else {
        for (const item of signed.data) {
          if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl);
        }
      }
    }

    return Response.json({
      participants: rows.map(({ paymentKey: _paymentKey, ...row }) => ({
        ...row,
        paymentUrl: signedByPath.get(_paymentKey) ?? `/api/admin/payments/${row.id}`,
      })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Failed to load admin participants", error);
    return Response.json({ error: "Peserta belum dapat dimuat." }, { status: 500 });
  }
}
