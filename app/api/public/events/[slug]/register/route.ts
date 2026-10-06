import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { events, participants } from "@/db/schema";
import { getSupabase } from "@/lib/supabase";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  let uploadedKey: string | null = null;
  try {
    const { slug } = await context.params;
    const db = getDb();
    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.slug, slug), eq(events.active, true)))
      .limit(1);
    if (!event) return Response.json({ error: "Event tidak ditemukan atau pendaftaran sudah ditutup." }, { status: 404 });

    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").replace(/\D+/g, "");
    const socialMedia = String(form.get("socialMedia") ?? "").trim();
    const address = String(form.get("address") ?? "").trim();
    const file = form.get("paymentProof");

    if (!name || phone.length < 9 || !socialMedia || !address || !(file instanceof File)) {
      return Response.json({ error: "Semua data wajib diisi dengan benar." }, { status: 400 });
    }
    if (!allowedTypes.has(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024) {
      return Response.json({ error: "Bukti transfer harus berupa JPG, PNG, WEBP, atau PDF maksimal 5 MB." }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100) || "bukti-transfer";
    uploadedKey = `payments/${event.id}/${id}-${safeName}`;
    const supabase = getSupabase();
    const { error: uploadError } = await supabase.storage.from("payments").upload(uploadedKey, file, {
      contentType: file.type,
      upsert: true,
    });
    
    if (uploadError) {
      throw new Error(`Upload error: ${uploadError.message}`);
    }

    await db.insert(participants).values({
      id,
      eventId: event.id,
      name,
      phone,
      socialMedia,
      address,
      paymentKey: uploadedKey,
      paymentName: file.name,
      paymentType: file.type,
      paymentSize: file.size,
      status: "pending",
      createdAt: new Date(),
    });

    return Response.json({ registrationId: id }, { status: 201 });
  } catch (error) {
    if (uploadedKey) {
      const supabase = getSupabase();
      await supabase.storage.from("payments").remove([uploadedKey]).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed") || message.includes("duplicate key value")) {
      return Response.json({ error: "Nomor HP ini sudah terdaftar pada event ini." }, { status: 409 });
    }
    console.error("Failed to create public registration", error);
    return Response.json({ error: "Pendaftaran belum berhasil dikirim. Silakan coba lagi." }, { status: 500 });
  }
}
