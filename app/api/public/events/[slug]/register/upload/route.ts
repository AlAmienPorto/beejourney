import { getSupabase } from "@/lib/supabase";
import { supabaseError } from "@/lib/supabase-data";
import { createUploadTicket } from "@/lib/upload-ticket";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const maxFileSize = 5 * 1024 * 1024;
const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const payload = (await request.json()) as Record<string, unknown>;
    const fileName = String(payload.fileName ?? "").trim();
    const fileType = String(payload.fileType ?? "").trim().toLowerCase();
    const fileSize = Number(payload.fileSize);

    if (!fileName || !allowedTypes.has(fileType) || !Number.isInteger(fileSize) || fileSize < 1 || fileSize > maxFileSize) {
      return Response.json(
        { error: "Bukti transfer harus berupa JPG, PNG, WEBP, atau PDF maksimal 5 MB." },
        { status: 400, headers: noStoreHeaders },
      );
    }

    const supabase = getSupabase();
    const event = await supabase
      .from("events")
      .select("id")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();
    if (event.error) throw supabaseError("Gagal memeriksa event", event.error);
    if (!event.data) {
      return Response.json(
        { error: "Event tidak ditemukan atau pendaftaran sudah ditutup." },
        { status: 404, headers: noStoreHeaders },
      );
    }

    const id = crypto.randomUUID();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100) || "bukti-transfer";
    const path = `payments/${event.data.id}/${id}-${safeName}`;
    const signed = await supabase.storage.from("payments").createSignedUploadUrl(path);
    if (signed.error || !signed.data) throw new Error(`Gagal menyiapkan upload: ${signed.error?.message ?? "unknown"}`);

    const uploadTicket = await createUploadTicket({
      id,
      eventId: event.data.id,
      path,
      fileName,
      fileType,
      fileSize,
      expiresAt: Date.now() + 30 * 60 * 1000,
    });

    return Response.json({
      upload: {
        signedUrl: signed.data.signedUrl,
        uploadTicket,
      },
    }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("Failed to prepare payment proof upload", error);
    return Response.json(
      { error: "Upload bukti transfer belum dapat disiapkan. Silakan coba lagi." },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
