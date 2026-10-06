import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { participants } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as { status?: string };
    if (payload.status !== "pending" && payload.status !== "verified") {
      return Response.json({ error: "Status tidak valid." }, { status: 400 });
    }
    const db = getDb();
    const [updated] = await db
      .update(participants)
      .set({ status: payload.status })
      .where(eq(participants.id, id))
      .returning();
    if (!updated) return Response.json({ error: "Peserta tidak ditemukan." }, { status: 404 });
    const { paymentKey: _paymentKey, ...participant } = updated;
    return Response.json({ participant: { ...participant, paymentUrl: `/api/admin/payments/${updated.id}` } });
  } catch (error) {
    console.error("Failed to update participant", error);
    return Response.json({ error: "Status belum berhasil diperbarui." }, { status: 500 });
  }
}
