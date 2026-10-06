"use client";

import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Copy,
  CreditCard,
  MapPin,
  MessageCircle,
  UploadCloud,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type PublicEvent = {
  slug: string;
  name: string;
  eventDate: string;
  location: string;
  fee: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  confirmationWhatsapp: string;
};

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

function normalizeWhatsApp(phone: string) {
  let digits = phone.replace(/\D+/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  else if (!digits.startsWith("62")) digits = `62${digits}`;
  return digits;
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00+07:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="mb-2 block text-sm font-semibold text-slate-800">
      {children} <span className="text-orange-500">*</span>
    </Label>
  );
}

export function RegistrationForm({ event }: { event: PublicEvent }) {
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingLabel, setSavingLabel] = useState("Mengirim…");
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [registeredName, setRegisteredName] = useState("");

  function copyAccount() {
    void navigator.clipboard?.writeText(event.bankAccountNumber);
    toast.success("Nomor rekening disalin");
  }

  async function submitRegistration(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    const form = submitEvent.currentTarget;
    const formData = new FormData(form);
    const paymentProof = formData.get("paymentProof");
    if (!(paymentProof instanceof File) || paymentProof.size === 0) {
      toast.error("Pilih bukti transfer terlebih dahulu.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(paymentProof.type) || paymentProof.size > 5 * 1024 * 1024) {
      toast.error("Bukti transfer harus berupa JPG, PNG, WEBP, atau PDF maksimal 5 MB.");
      return;
    }
    setSaving(true);
    try {
      setSavingLabel("Menyiapkan upload…");
      const prepareResponse = await fetch(`/api/public/events/${encodeURIComponent(event.slug)}/register/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: paymentProof.name,
          fileType: paymentProof.type,
          fileSize: paymentProof.size,
        }),
      });
      const prepared = (await prepareResponse.json()) as {
        upload?: { signedUrl: string; uploadTicket: string };
        error?: string;
      };
      if (!prepareResponse.ok || !prepared.upload) {
        throw new Error(prepared.error || "Upload bukti transfer belum dapat disiapkan.");
      }

      setSavingLabel("Mengunggah bukti…");
      const uploadBody = new FormData();
      uploadBody.append("cacheControl", "3600");
      uploadBody.append("", paymentProof);
      const uploadResponse = await fetch(prepared.upload.signedUrl, {
        method: "PUT",
        headers: { "x-upsert": "false" },
        body: uploadBody,
      });
      if (!uploadResponse.ok) throw new Error("Bukti transfer gagal diunggah. Silakan coba lagi.");

      setSavingLabel("Menyimpan pendaftaran…");
      const response = await fetch(`/api/public/events/${encodeURIComponent(event.slug)}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          phone: formData.get("phone"),
          socialMedia: formData.get("socialMedia"),
          address: formData.get("address"),
          uploadTicket: prepared.upload.uploadTicket,
        }),
      });
      const data = (await response.json()) as { registrationId?: string; error?: string };
      if (!response.ok || !data.registrationId) {
        throw new Error(data.error || "Pendaftaran belum berhasil dikirim.");
      }
      setRegisteredName(String(formData.get("name") ?? ""));
      setRegistrationId(data.registrationId);
      form.reset();
      setFileName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pendaftaran belum berhasil dikirim.");
    } finally {
      setSaving(false);
      setSavingLabel("Mengirim…");
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <Toaster position="top-center" richColors />
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="BeeJourney Logo" className="h-11 w-auto object-contain" />
            <span>
              <strong className="block text-[15px] tracking-tight">BeeJourney</strong>
              <span className="block text-xs text-slate-500">Event Organizer</span>
            </span>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 sm:flex">
            <span className="size-2 rounded-full bg-blue-500" /> Pendaftaran dibuka
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-7 px-5 py-8 lg:grid-cols-[minmax(0,1.2fr)_380px] lg:px-8 lg:py-12">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(40,56,95,.08)]">
          <div className="relative overflow-hidden bg-[#101d46] px-6 py-8 text-white sm:px-9">
            <div className="absolute -right-14 -top-20 size-52 rounded-full border-[34px] border-[#ff7a45]/90" />
            <div className="absolute bottom-[-52px] right-32 size-28 rotate-12 rounded-[28px] bg-[#3153d4]" />
            <div className="relative max-w-xl">
              <span className="mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-blue-100">
                FORMULIR PESERTA
              </span>
              <h1 className="text-3xl font-bold leading-tight tracking-[-.035em] sm:text-[40px]">
                {event.name}
              </h1>
              <p className="mt-3 max-w-lg text-[15px] leading-7 text-blue-100/80">
                Lengkapi data diri dan unggah bukti transfer. Tim BeeJourney akan memeriksa pembayaran setelah pendaftaran masuk.
              </p>
            </div>
          </div>

          {registrationId ? (
            <div className="grid min-h-[500px] place-items-center p-7 text-center sm:p-12">
              <div className="max-w-md">
                <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="size-8" />
                </span>
                <h2 className="mt-5 text-2xl font-bold tracking-tight">Pendaftaran berhasil dikirim</h2>
                <p className="mt-3 leading-7 text-slate-600">
                  Data dan bukti transfermu sudah diterima. Admin akan menghubungi melalui WhatsApp setelah pemeriksaan.
                </p>
                <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 font-mono text-xs text-slate-500">
                  Referensi: {registrationId.slice(0, 8).toUpperCase()}
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  {event.confirmationWhatsapp && (
                    <Button asChild className="h-12 rounded-xl bg-[#168447] hover:bg-[#116b39]">
                      <a
                        href={`https://wa.me/${normalizeWhatsApp(event.confirmationWhatsapp)}?text=${encodeURIComponent(`Halo kak, aku telah melakukan pembayaran ya atas nama ${registeredName} untuk event ${event.name}, sebesar ${formatRupiah(event.fee)}.`)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle /> Konfirmasi Pembayaran via WhatsApp
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setRegistrationId(null)}>
                    Daftarkan peserta lain
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <form className="space-y-6 p-6 sm:p-9" onSubmit={submitRegistration}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel>Nama lengkap</FieldLabel>
                  <Input className="h-12 rounded-xl" name="name" placeholder="Sesuai identitas" required />
                </div>
                <div>
                  <FieldLabel>No. HP / WhatsApp</FieldLabel>
                  <Input className="h-12 rounded-xl" name="phone" inputMode="tel" placeholder="08xxxxxxxxxx" required />
                </div>
              </div>
              <div>
                <FieldLabel>Social media</FieldLabel>
                <Input className="h-12 rounded-xl" name="socialMedia" placeholder="Contoh: @username (Instagram / TikTok)" required />
              </div>
              <div>
                <FieldLabel>Alamat</FieldLabel>
                <Textarea className="min-h-24 rounded-xl" name="address" placeholder="Tulis alamat domisili lengkap" required />
              </div>
              <div>
                <FieldLabel>Bukti transfer</FieldLabel>
                <label className="group flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 px-5 text-center transition hover:border-blue-400 hover:bg-blue-50">
                  <UploadCloud className="mb-2 size-7 text-[#3153d4]" />
                  <span className="text-sm font-semibold text-slate-800">{fileName || "Pilih bukti transfer"}</span>
                  <span className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP, atau PDF · maksimal 5 MB</span>
                  <input
                    className="sr-only"
                    type="file"
                    name="paymentProof"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    required
                    onChange={(inputEvent) => setFileName(inputEvent.target.files?.[0]?.name ?? "")}
                  />
                </label>
              </div>
              <div className="flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500">Data hanya digunakan untuk pengelolaan event ini.</p>
                <Button size="lg" disabled={saving} className="h-12 rounded-xl bg-[#3153d4] px-7 hover:bg-[#263fad]">
                  {saving ? savingLabel : "Kirim pendaftaran"}
                </Button>
              </div>
            </form>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-[24px] bg-[#ff7643] p-6 text-white shadow-[0_20px_50px_rgba(255,118,67,.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-orange-100">Transfer pembayaran</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight">{formatRupiah(event.fee)}</h2>
              </div>
              <span className="grid size-11 place-items-center rounded-2xl bg-white/15"><CreditCard /></span>
            </div>
            <div className="mt-6 rounded-2xl bg-white p-5 text-slate-950">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-black tracking-[.2em] text-blue-700">{event.bankName}</span>
                  <p className="mt-1 font-mono text-xl font-bold tracking-wide">{event.bankAccountNumber}</p>
                </div>
                <Button type="button" variant="ghost" size="icon" className="rounded-xl" onClick={copyAccount} aria-label="Salin nomor rekening">
                  <Copy />
                </Button>
              </div>
              <p className="mt-3 border-t border-slate-100 pt-3 text-sm font-medium text-slate-600">{event.bankAccountName}</p>
            </div>
            <p className="mt-4 text-xs leading-5 text-orange-50">Pastikan nominal dan nama tujuan sudah benar sebelum transfer.</p>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[.13em] text-slate-400">Detail event</p>
            <h3 className="mt-3 text-xl font-bold tracking-tight">{event.name}</h3>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <p className="flex items-center gap-3"><CalendarDays className="size-4 text-blue-600" /> {formatDate(event.eventDate)}</p>
              <p className="flex items-center gap-3"><MapPin className="size-4 text-blue-600" /> {event.location}</p>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
