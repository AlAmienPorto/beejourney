import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { events } from "@/db/schema";
import { RegistrationForm } from "./registration-form";

export const dynamic = "force-dynamic";

async function getPublicEvent(slug: string) {
  const db = getDb();
  const [event] = await db
    .select({
      slug: events.slug,
      name: events.name,
      eventDate: events.eventDate,
      location: events.location,
      fee: events.fee,
      bankName: events.bankName,
      bankAccountNumber: events.bankAccountNumber,
      bankAccountName: events.bankAccountName,
      confirmationWhatsapp: events.confirmationWhatsapp,
    })
    .from(events)
    .where(and(eq(events.slug, slug), eq(events.active, true)))
    .limit(1);
  return event?.slug ? { ...event, slug: event.slug } : null;
}

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
