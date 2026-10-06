import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getSupabase } from "@/lib/supabase";
import { supabaseError } from "@/lib/supabase-data";
import { RegistrationForm } from "./registration-form";

export const dynamic = "force-dynamic";

const getPublicEvent = cache(async (slug: string) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("events")
    .select("slug,name,event_date,location,fee,bank_name,bank_account_number,bank_account_name,confirmation_whatsapp")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) throw supabaseError("Gagal memuat event publik", error);
  if (!data?.slug) return null;
  return {
    slug: data.slug,
    name: data.name,
    eventDate: data.event_date,
    location: data.location,
    fee: data.fee,
    bankName: data.bank_name,
    bankAccountNumber: data.bank_account_number,
    bankAccountName: data.bank_account_name,
    confirmationWhatsapp: data.confirmation_whatsapp,
  };
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  if (!event) return { title: "Event tidak ditemukan — BeeJourney" };
  return {
    title: `${event.name} — BeeJourney`,
    description: `Formulir pendaftaran ${event.name} oleh BeeJourney Event Organizer.`,
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  if (!event) notFound();
  return <RegistrationForm event={event} />;
}
