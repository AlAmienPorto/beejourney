import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { events } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";

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

    const db = getDb();
    const [updated] = await db
      .update(events)
      .set({ name, eventDate, location, quota, fee, bankName, bankAccountNumber, bankAccountName, confirmationWhatsapp, active })
      .where(eq(events.id, id))
      .returning();
    if (!updated) return Response.json({ error: "Event tidak ditemukan." }, { status: 404 });
    return Response.json({ event: updated });
  } catch (error) {
    console.error("Failed to update event", error);
    return Response.json({ error: "Event belum berhasil diperbarui." }, { status: 500 });
  }
}
