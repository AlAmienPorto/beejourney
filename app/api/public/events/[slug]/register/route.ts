import { getSupabase } from "@/lib/supabase";
import { isUniqueViolation, supabaseError } from "@/lib/supabase-data";
import { verifyUploadTicket } from "@/lib/upload-ticket";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const payload = (await request.json()) as Record<string, unknown>;
    const name = String(payload.name ?? "").trim();
    const phone = String(payload.phone ?? "").replace(/\D+/g, "");
    const socialMedia = String(payload.socialMedia ?? "").trim();
    const address = String(payload.address ?? "").trim();
    const ticket = await verifyUploadTicket(payload.uploadTicket);

    if (!name || phone.length < 9 || !socialMedia || !address || !ticket) {
      return Response.json({ error: "Semua data wajib diisi dengan benar." }, { status: 400, headers: noStoreHeaders });
    }
    if (!allowedTypes.has(ticket.fileType) || ticket.fileSize < 1 || ticket.fileSize > 5 * 1024 * 1024) {
      return Response.json({ error: "Data bukti transfer tidak valid." }, { status: 400, headers: noStoreHeaders });
    }
    const supabase = getSupabase();
    const [eventResult, fileResult, existingResult] = await Promise.all([
      supabase.from("events").select("id").eq("slug", slug).eq("active", true).maybeSingle(),
      supabase.storage.from("payments").info(ticket.path),
      supabase.from("participants").select("payment_key").eq("id", ticket.id).maybeSingle(),
    ]);
    if (existingResult.error) throw supabaseError("Gagal memeriksa pendaftaran", existingResult.error);
    if (existingResult.data?.payment_key === ticket.path) {
      return Response.json({ registrationId: ticket.id }, { headers: noStoreHeaders });
    }
    if (eventResult.error) throw supabaseError("Gagal memeriksa event", eventResult.error);
    if (!eventResult.data || eventResult.data.id !== ticket.eventId) {
      await supabase.storage.from("payments").remove([ticket.path]);
      return Response.json({ error: "Event tidak ditemukan atau pendaftaran sudah ditutup." }, { status: 404, headers: noStoreHeaders });
    }
    if (
      fileResult.error
      || !fileResult.data
      || fileResult.data.size !== ticket.fileSize
      || fileResult.data.contentType !== ticket.fileType
    ) {
      await supabase.storage.from("payments").remove([ticket.path]).catch(() => undefined);
      return Response.json({ error: "Upload bukti transfer belum selesai atau tidak valid." }, { status: 400, headers: noStoreHeaders });
    }

    const inserted = await supabase.from("participants").insert({
      id: ticket.id,
      event_id: eventResult.data.id,
      name,
      phone,
      social_media: socialMedia,
      address,
      payment_key: ticket.path,
      payment_name: ticket.fileName,
      payment_type: ticket.fileType,
      payment_size: ticket.fileSize,
      status: "pending",
      created_at: new Date().toISOString(),
    });
    if (inserted.error) {
      if (inserted.error.code === "23505") {
        const replay = await supabase
          .from("participants")
          .select("payment_key")
          .eq("id", ticket.id)
          .maybeSingle();
        if (!replay.error && replay.data?.payment_key === ticket.path) {
          return Response.json({ registrationId: ticket.id }, { headers: noStoreHeaders });
        }
      }
      await supabase.storage.from("payments").remove([ticket.path]).catch(() => undefined);
      throw supabaseError("Gagal menyimpan pendaftaran", inserted.error);
    }

    return Response.json({ registrationId: ticket.id }, { status: 201, headers: noStoreHeaders });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return Response.json({ error: "Nomor HP ini sudah terdaftar pada event ini." }, { status: 409, headers: noStoreHeaders });
    }
    console.error("Failed to create public registration", error);
    return Response.json({ error: "Pendaftaran belum berhasil dikirim. Silakan coba lagi." }, { status: 500, headers: noStoreHeaders });
  }
}
