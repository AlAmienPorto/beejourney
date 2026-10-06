import { requireAdminApi } from "@/lib/admin-auth";
import { backfillEventSlugs, createEventSlug } from "@/lib/events";
import { getSupabase } from "@/lib/supabase";
import { EVENT_COLUMNS, mapEvent, supabaseError } from "@/lib/supabase-data";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function GET() {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  try {
    const supabase = getSupabase();
    const initial = await supabase.from("events").select(EVENT_COLUMNS).order("event_date", { ascending: true });
    if (initial.error) throw supabaseError("Gagal memuat event", initial.error);
    let rows = initial.data ?? [];

    if (rows.length === 0) {
      const id = crypto.randomUUID();
      const seeded = await supabase.from("events").insert({
        id,
        slug: createEventSlug("Creative Class — Batch 01", id),
        name: "Creative Class — Batch 01",
        event_date: "2026-10-18",
        location: "Malang Creative Center",
        quota: 40,
        fee: 80000,
        bank_name: "BCA",
        bank_account_number: "2380842940",
        bank_account_name: "Izza Riskuna Sa'adah",
        confirmation_whatsapp: "",
        active: true,
        created_at: new Date("2026-10-05T00:00:00+07:00").toISOString(),
      }).select(EVENT_COLUMNS).single();
      if (seeded.error) throw supabaseError("Gagal membuat event awal", seeded.error);
      rows = [seeded.data];
    } else {
      const missingSlugs = rows.filter((event) => !event.slug);
      if (missingSlugs.length > 0) {
        await backfillEventSlugs(missingSlugs);
        const refreshed = await supabase.from("events").select(EVENT_COLUMNS).order("event_date", { ascending: true });
        if (refreshed.error) throw supabaseError("Gagal memuat ulang event", refreshed.error);
        rows = refreshed.data ?? [];
      }
    }
    return Response.json({ events: rows.map(mapEvent) }, { headers: noStoreHeaders });
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
      event_date: eventDate,
      location,
      quota,
      fee,
      bank_name: bankName,
      bank_account_number: bankAccountNumber,
      bank_account_name: bankAccountName,
      confirmation_whatsapp: confirmationWhatsapp,
      active: true,
      created_at: new Date().toISOString(),
    };
    const supabase = getSupabase();
    const { data, error } = await supabase.from("events").insert(row).select(EVENT_COLUMNS).single();
    if (error) throw supabaseError("Gagal menyimpan event", error);
    return Response.json({ event: mapEvent(data) }, { status: 201, headers: noStoreHeaders });
  } catch (error) {
    console.error("Failed to create event", error);
    return Response.json({ error: "Event belum berhasil disimpan." }, { status: 500 });
  }
}
