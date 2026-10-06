import { requireAdminApi } from "@/lib/admin-auth";
import { getSupabase } from "@/lib/supabase";
import { EVENT_COLUMNS, mapEvent, supabaseError } from "@/lib/supabase-data";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as Record<string, unknown>;
    const name = String(payload.name ?? "").trim();
    const eventDate = String(payload.eventDate ?? "").trim();
    const location = String(payload.location ?? "").trim();
    const quota = Number(payload.quota);
    const fee = Number(payload.fee);
    const bankName = String(payload.bankName ?? "").trim();
    const bankAccountNumber = String(payload.bankAccountNumber ?? "").replace(/\s+/g, "");
    const bankAccountName = String(payload.bankAccountName ?? "").trim();
    const confirmationWhatsapp = String(payload.confirmationWhatsapp ?? "").replace(/\D+/g, "");
    const active = payload.active !== false;
    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !location || !Number.isInteger(quota) || quota < 1
      || !Number.isInteger(fee) || fee < 0 || !bankName || !bankAccountNumber || !bankAccountName || confirmationWhatsapp.length < 9) {
      return Response.json({ error: "Data event belum lengkap." }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("events")
      .update({
        name,
        event_date: eventDate,
        location,
        quota,
        fee,
        bank_name: bankName,
        bank_account_number: bankAccountNumber,
        bank_account_name: bankAccountName,
        confirmation_whatsapp: confirmationWhatsapp,
        active,
      })
      .eq("id", id)
      .select(EVENT_COLUMNS)
      .maybeSingle();
    if (error) throw supabaseError("Gagal memperbarui event", error);
    if (!data) return Response.json({ error: "Event tidak ditemukan." }, { status: 404 });
    return Response.json({ event: mapEvent(data) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Failed to update event", error);
    return Response.json({ error: "Event belum berhasil diperbarui." }, { status: 500 });
  }
}
