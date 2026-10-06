import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { events } from "@/db/schema";
import { requireAdminApi } from "@/lib/admin-auth";
import { backfillEventSlugs, createEventSlug } from "@/lib/events";

export async function GET() {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  try {
    const db = getDb();
    let rows = await db.select().from(events).orderBy(asc(events.eventDate));
    if (rows.length === 0) {
      const id = crypto.randomUUID();
      await db.insert(events).values({
        id,
        slug: createEventSlug("Creative Class — Batch 01", id),
        name: "Creative Class — Batch 01",
        eventDate: "2026-10-18",
        location: "Malang Creative Center",
        quota: 40,
        fee: 80000,
        bankName: "BCA",
        bankAccountNumber: "2380842940",
        bankAccountName: "Izza Riskuna Sa'adah",
        confirmationWhatsapp: "",
        active: true,
        createdAt: new Date("2026-10-05T00:00:00+07:00"),
      });
    } else if (rows.some((event) => !event.slug)) {
      await backfillEventSlugs();
    }
    rows = await db.select().from(events).orderBy(asc(events.eventDate));
    return Response.json({ events: rows });
  } catch (error) {
    console.error("Failed to load admin events", error);
    return Response.json({ error: "Event belum dapat dimuat." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  try {
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
    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !location || !Number.isInteger(quota) || quota < 1
      || !Number.isInteger(fee) || fee < 0 || !bankName || !bankAccountNumber || !bankAccountName || confirmationWhatsapp.length < 9) {
      return Response.json({ error: "Data event belum lengkap." }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const row = {
      id,
      slug: createEventSlug(name, id),
      name,
      eventDate,
      location,
      quota,
      fee,
      bankName,
      bankAccountNumber,
      bankAccountName,
      confirmationWhatsapp,
      active: true,
      createdAt: new Date(),
    };
    const db = getDb();
    const [created] = await db.insert(events).values(row).returning();
    return Response.json({ event: created }, { status: 201 });
  } catch (error) {
    console.error("Failed to create event", error);
    return Response.json({ error: "Event belum berhasil disimpan." }, { status: 500 });
  }
}
