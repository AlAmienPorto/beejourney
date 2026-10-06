import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { participants } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  try {
    const eventId = new URL(request.url).searchParams.get("eventId")?.trim();
    if (!eventId) return Response.json({ error: "Event wajib dipilih." }, { status: 400 });
    const db = getDb();
    const rows = await db
      .select()
      .from(participants)
      .where(eq(participants.eventId, eventId))
      .orderBy(desc(participants.createdAt));
    return Response.json({
      participants: rows.map(({ paymentKey: _paymentKey, ...row }) => ({
        ...row,
        paymentUrl: `/api/admin/payments/${row.id}`,
      })),
    });
  } catch (error) {
    console.error("Failed to load admin participants", error);
    return Response.json({ error: "Peserta belum dapat dimuat." }, { status: 500 });
  }
}
