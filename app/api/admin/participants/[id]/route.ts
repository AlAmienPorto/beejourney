import { requireAdminApi } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";
import { mapParticipant, PARTICIPANT_COLUMNS, supabaseError } from "@/lib/supabase-data";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as { status?: string };
    if (payload.status !== "pending" && payload.status !== "verified") {
      return Response.json({ error: "Status tidak valid." }, { status: 400 });
    }
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("participants")
      .update({ status: payload.status })
      .eq("id", id)
      .select(PARTICIPANT_COLUMNS)
      .maybeSingle();
    if (error) throw supabaseError("Gagal memperbarui peserta", error);
    if (!data) return Response.json({ error: "Peserta tidak ditemukan." }, { status: 404 });
    const updated = mapParticipant(data);
    const { paymentKey: _paymentKey, ...participant } = updated;
    return Response.json(
      { participant: { ...participant, paymentUrl: `/api/admin/payments/${updated.id}` } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Failed to update participant", error);
    return Response.json({ error: "Status belum berhasil diperbarui." }, { status: 500 });
  }
}
