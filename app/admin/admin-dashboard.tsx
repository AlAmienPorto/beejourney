"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Link2,
  LogOut,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UploadCloud,
  UserCheck,
  Users,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EventItem = {
  id: string;
  slug: string;
  name: string;
  eventDate: string;
  location: string;
  quota: number;
  fee: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  confirmationWhatsapp: string;
  active: boolean;
};

type Participant = {
  id: string;
  eventId: string;
  name: string;
  phone: string;
  socialMedia: string;
  address: string;
  status: "pending" | "verified";
  attended: boolean;
  createdAt: string;
  paymentName: string;
  paymentType: string;
  paymentUrl: string;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatDate(value: string) {
  return new Date(`${value}T12:00:00+07:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeWhatsApp(phone: string) {
  let digits = phone.replace(/\D+/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  else if (!digits.startsWith("62")) digits = `62${digits}`;
  return digits;
}

function whatsappLink(participant: Participant, event: EventItem) {
  const message = `jangan lupa join grup ya sayang \nhttps://chat.whatsapp.com/DYhTWzcaOj4GQV1ZRqCsXj`;
  return `https://wa.me/${normalizeWhatsApp(participant.phone)}?text=${encodeURIComponent(message)}`;
}

function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function csvFileName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "event";
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Label className="mb-2 block text-sm font-semibold text-slate-800">{children}</Label>;
}

export function AdminDashboard({
  adminName,
}: {
  adminName: string;
}) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [updatingParticipantId, setUpdatingParticipantId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? events[0];
  const eventLink = selectedEvent && origin ? `${origin}/event/${selectedEvent.slug}` : "";
  const filteredParticipants = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return participants;
    return participants.filter((participant) =>
      `${participant.name} ${participant.phone} ${participant.socialMedia} ${participant.address}`
        .toLowerCase()
        .includes(needle),
    );
  }, [participants, search]);

  useEffect(() => {
    setOrigin(window.location.origin);
    void loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) void loadParticipants(selectedEventId);
  }, [selectedEventId]);

  async function loadEvents() {
    try {
      const response = await fetch("/api/admin/events");
      const data = (await response.json()) as { events?: EventItem[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Event belum dapat dimuat.");
      const rows = (data.events ?? []).filter((event): event is EventItem => Boolean(event.slug));
      setEvents(rows);
      if (rows[0]) {
        setSelectedEventId((current) => rows.some((event) => event.id === current) ? current : rows[0].id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Event belum dapat dimuat.");
    }
  }

  async function loadParticipants(eventId: string) {
    setLoadingParticipants(true);
    try {
      const response = await fetch(`/api/admin/participants?eventId=${encodeURIComponent(eventId)}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as { participants?: Participant[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Peserta belum dapat dimuat.");
      setParticipants(data.participants ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Peserta belum dapat dimuat.");
    } finally {
      setLoadingParticipants(false);
    }
  }

  function openCreateEvent() {
    setEditingEvent(null);
    setEventDialogOpen(true);
  }

  function openEditEvent() {
    if (!selectedEvent) return;
    setEditingEvent(selectedEvent);
    setEventDialogOpen(true);
  }

  async function saveEvent(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const payload = {
      name: String(form.get("eventName") ?? ""),
      eventDate: String(form.get("eventDate") ?? ""),
      location: String(form.get("eventLocation") ?? ""),
      quota: Number(form.get("eventQuota")),
      fee: Number(form.get("eventFee")),
      bankName: String(form.get("eventBank") ?? ""),
      bankAccountNumber: String(form.get("eventAccountNumber") ?? ""),
      bankAccountName: String(form.get("eventAccountName") ?? ""),
      confirmationWhatsapp: String(form.get("eventWhatsapp") ?? ""),
      active: form.get("eventActive") === "on",
    };
    setSavingEvent(true);
    try {
      const response = await fetch(editingEvent ? `/api/admin/events/${editingEvent.id}` : "/api/admin/events", {
        method: editingEvent ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { event?: EventItem; error?: string };
      if (!response.ok || !data.event) throw new Error(data.error || "Event belum berhasil disimpan.");
      setEvents((current) => editingEvent
        ? current.map((event) => event.id === data.event!.id ? data.event! : event)
        : [...current, data.event!]);
      setSelectedEventId(data.event.id);
      setEventDialogOpen(false);
      toast.success(editingEvent ? "Event berhasil diperbarui" : "Event baru dan link form berhasil dibuat");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Event belum berhasil disimpan.");
    } finally {
      setSavingEvent(false);
    }
  }

  async function copyEventLink() {
    if (!eventLink) return;
    await navigator.clipboard.writeText(eventLink);
    toast.success("Link form event disalin");
  }

  async function logout() {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  function exportParticipantsCsv() {
    if (!selectedEvent || participants.length === 0) return;
    const headers = [
      "No",
      "Nama",
      "No. HP / WhatsApp",
      "Social Media",
      "Alamat",
      "Status Pembayaran",
      "Kehadiran",
      "Nama File Bukti",
      "Waktu Daftar",
    ];
    const rows = participants.map((participant, index) => [
      index + 1,
      participant.name,
      participant.phone,
      participant.socialMedia,
      participant.address,
      participant.status === "verified" ? "Terverifikasi" : "Menunggu",
      participant.attended ? "Hadir" : "Belum hadir",
      participant.paymentName,
      new Date(participant.createdAt).toLocaleString("id-ID"),
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `peserta-${csvFileName(selectedEvent.name)}-${selectedEvent.eventDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    toast.success("Data peserta berhasil diekspor");
  }

  async function updateParticipant(
    participantId: string,
    updates: Partial<Pick<Participant, "status" | "attended">>,
    successMessage: string,
  ) {
    setUpdatingParticipantId(participantId);
    try {
      const response = await fetch(`/api/admin/participants/${participantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = (await response.json()) as { participant?: Participant; error?: string };
      if (!response.ok || !data.participant) throw new Error(data.error || "Data peserta belum berhasil diperbarui.");
      setParticipants((current) => current.map((participant) => participant.id === participantId
        ? { ...data.participant!, paymentUrl: participant.paymentUrl }
        : participant));
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Data peserta belum berhasil diperbarui.");
    } finally {
      setUpdatingParticipantId(null);
    }
  }

  async function updatePaymentStatus(participantId: string, status: "pending" | "verified") {
    await updateParticipant(participantId, { status }, "Status pembayaran diperbarui");
  }

  async function updateAttendance(participantId: string, attended: boolean) {
    await updateParticipant(participantId, { attended }, attended ? "Peserta ditandai hadir" : "Kehadiran peserta dibatalkan");
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <Toaster position="top-center" richColors />
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-5 px-5 py-4 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logo.png" alt="BeeJourney Logo" className="h-11 w-auto object-contain" />
            <span className="min-w-0">
              <strong className="block truncate text-[15px] tracking-tight">BeeJourney Event Organizer</strong>
              <span className="block text-xs text-slate-500">Dashboard admin</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-right md:block">
              <p className="max-w-48 truncate text-xs font-semibold text-slate-700">{adminName}</p>
              <p className="max-w-48 truncate text-[11px] text-slate-400">Administrator</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => void logout()} aria-label="Keluar dari dashboard"><LogOut /></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1320px] px-5 py-8 lg:px-10 lg:py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">Ruang kerja admin</p>
            <h1 className="mt-1 text-3xl font-bold tracking-[-.035em]">Kelola event & peserta</h1>
            <p className="mt-2 text-sm text-slate-500">Buat link pendaftaran, pantau peserta, dan periksa pembayaran.</p>
          </div>
          <Button onClick={openCreateEvent} className="h-11 rounded-xl bg-[#3153d4] px-5 hover:bg-[#263fad]"><Plus /> Tambah event</Button>
        </div>

        {selectedEvent && (
          <section className="mt-8 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(40,56,95,.05)] sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 flex-1">
                <Label className="mb-2 block text-xs font-bold uppercase tracking-[.12em] text-slate-400">Event aktif di dashboard</Label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger className="h-12 w-full rounded-xl text-base font-semibold lg:max-w-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="h-11 rounded-xl" onClick={openEditEvent}><Pencil /> Edit detail event</Button>
            </div>

            <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="min-w-0">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500"><Link2 className="size-3.5" /> Link form publik</p>
                <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 p-2 pl-4">
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-600">{eventLink}</span>
                  <Button size="sm" onClick={copyEventLink} className="rounded-lg bg-[#3153d4] hover:bg-[#263fad]"><Copy /> Salin link</Button>
                </div>
              </div>
              <Button variant="ghost" asChild className="justify-start text-blue-700 lg:justify-center">
                <a href={`/event/${selectedEvent.slug}`} target="_blank" rel="noreferrer"><ExternalLink /> Buka form</a>
              </Button>
            </div>
          </section>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="stat-card"><div><span>Total peserta</span><strong>{participants.length}</strong></div><span className="stat-icon bg-blue-50 text-blue-600"><Users /></span></div>
          <div className="stat-card"><div><span>Terverifikasi</span><strong>{participants.filter((item) => item.status === "verified").length}</strong></div><span className="stat-icon bg-emerald-50 text-emerald-600"><CheckCircle2 /></span></div>
          <div className="stat-card"><div><span>Menunggu</span><strong>{participants.filter((item) => item.status === "pending").length}</strong></div><span className="stat-icon bg-orange-50 text-orange-600"><CreditCard /></span></div>
          <div className="stat-card"><div><span>Hadir</span><strong>{participants.filter((item) => item.attended).length}</strong></div><span className="stat-icon bg-violet-50 text-violet-600"><UserCheck /></span></div>
        </div>

        <section className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_45px_rgba(40,56,95,.06)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600"><CalendarDays /></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-400">PESERTA EVENT</p>
                <p className="mt-1 truncate font-bold">{selectedEvent?.name ?? "Pilih event"}</p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
              <Button
                variant="outline"
                className="h-11 rounded-xl"
                disabled={!selectedEventId || loadingParticipants}
                onClick={() => void loadParticipants(selectedEventId)}
                aria-label="Muat ulang data peserta"
              >
                <RefreshCw className={loadingParticipants ? "animate-spin" : undefined} />
                {loadingParticipants ? "Memuat..." : "Reload"}
              </Button>
              <Button variant="outline" className="h-11 rounded-xl" disabled={participants.length === 0} onClick={exportParticipantsCsv}>
                <Download /> Export CSV
              </Button>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 rounded-xl bg-slate-50 pl-10" placeholder="Cari nama atau nomor HP" />
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="pl-5 text-xs text-slate-500">Peserta</TableHead>
                <TableHead className="text-xs text-slate-500">Kontak</TableHead>
                <TableHead className="text-xs text-slate-500">Bukti transfer</TableHead>
                <TableHead className="text-xs text-slate-500">Status</TableHead>
                <TableHead className="text-xs text-slate-500">Kehadiran</TableHead>
                <TableHead className="pr-5 text-right text-xs text-slate-500">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell className="py-4 pl-5">
                    <div className="font-semibold text-slate-900">{participant.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{participant.socialMedia} · {formatTimestamp(participant.createdAt)}</div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    <div>{participant.phone}</div>
                    <div className="mt-1 max-w-48 truncate text-xs text-slate-400">{participant.address}</div>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setPreviewImage(participant.paymentUrl)}>
                      <UploadCloud /> Buka bukti
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={participant.status}
                      disabled={updatingParticipantId === participant.id}
                      onValueChange={(value) => void updatePaymentStatus(participant.id, value as "pending" | "verified")}
                    >
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Menunggu</SelectItem>
                        <SelectItem value="verified">Terverifikasi</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={participant.attended ? "default" : "outline"}
                      size="sm"
                      aria-pressed={participant.attended}
                      disabled={updatingParticipantId === participant.id}
                      onClick={() => void updateAttendance(participant.id, !participant.attended)}
                      className={participant.attended ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                    >
                      <UserCheck /> {participant.attended ? "Sudah hadir" : "Tandai hadir"}
                    </Button>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    {selectedEvent && (
                      <Button size="sm" asChild className="bg-[#168447] hover:bg-[#116b39]">
                        <a href={whatsappLink(participant, selectedEvent)} target="_blank" rel="noreferrer"><MessageCircle /> Follow Up WhatsApp</a>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredParticipants.length === 0 && (
                <TableRow><TableCell colSpan={6} className="h-40 text-center text-slate-500">{loadingParticipants ? "Memuat peserta…" : "Belum ada peserta untuk event ini."}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>

          {selectedEvent && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 text-xs text-slate-500">
              <span className="flex items-center gap-2"><CalendarDays className="size-3.5" /> {formatDate(selectedEvent.eventDate)}</span>
              <span className="flex items-center gap-2"><MapPin className="size-3.5" /> {selectedEvent.location}</span>
              <span>{rupiah.format(selectedEvent.fee)} · Kuota {selectedEvent.quota}</span>
            </div>
          )}
        </section>
      </div>

      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-xl">
          <form key={editingEvent?.id ?? "new-event"} onSubmit={saveEvent}>
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Edit detail event" : "Tambah event baru"}</DialogTitle>
              <DialogDescription>
                {editingEvent ? "Perubahan langsung tampil pada link form yang sama." : "Link form unik dibuat otomatis setelah event disimpan."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5">
              <div><FieldLabel>Nama event</FieldLabel><Input name="eventName" defaultValue={editingEvent?.name} required /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><FieldLabel>Tanggal</FieldLabel><Input name="eventDate" type="date" defaultValue={editingEvent?.eventDate} required /></div>
                <div><FieldLabel>Kuota</FieldLabel><Input name="eventQuota" type="number" min="1" defaultValue={editingEvent?.quota ?? 30} required /></div>
              </div>
              <div><FieldLabel>Lokasi</FieldLabel><Input name="eventLocation" defaultValue={editingEvent?.location} required /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><FieldLabel>Biaya pendaftaran</FieldLabel><Input name="eventFee" type="number" min="0" step="1000" defaultValue={editingEvent?.fee ?? 80000} required /></div>
                <div><FieldLabel>Bank</FieldLabel><Input name="eventBank" defaultValue={editingEvent?.bankName ?? "BCA"} placeholder="BCA" required /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><FieldLabel>Nomor rekening</FieldLabel><Input name="eventAccountNumber" inputMode="numeric" defaultValue={editingEvent?.bankAccountNumber ?? "2380842940"} required /></div>
                <div><FieldLabel>Nama penerima transfer</FieldLabel><Input name="eventAccountName" defaultValue={editingEvent?.bankAccountName ?? "Izza Riskuna Sa'adah"} required /></div>
              </div>
              <div><FieldLabel>WhatsApp konfirmasi pembayaran</FieldLabel><Input name="eventWhatsapp" inputMode="tel" defaultValue={editingEvent?.confirmationWhatsapp} placeholder="Contoh: 081234567890" required /></div>
              {editingEvent && (
                <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                  <span><span className="block text-sm font-semibold">Pendaftaran aktif</span><span className="text-xs text-slate-500">Form dapat dibuka dan menerima peserta</span></span>
                  <Switch name="eventActive" defaultChecked={editingEvent.active} />
                </label>
              )}
              {!editingEvent && <input type="hidden" name="eventActive" value="on" />}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEventDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={savingEvent} className="bg-[#3153d4] hover:bg-[#263fad]">{savingEvent ? "Menyimpan…" : "Simpan event"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl border-none bg-transparent shadow-none sm:max-w-3xl">
          <DialogTitle className="sr-only">Preview Bukti Transfer</DialogTitle>
          <div className="relative flex justify-center">
            {previewImage && <img src={previewImage} alt="Bukti transfer" className="max-h-[85vh] rounded-xl object-contain shadow-2xl" />}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
