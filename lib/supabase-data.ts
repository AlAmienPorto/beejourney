type EventRow = {
  id: string;
  slug: string | null;
  name: string;
  event_date: string;
  location: string;
  quota: number;
  fee: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  confirmation_whatsapp: string;
  active: boolean;
  created_at: string;
};

type ParticipantRow = {
  id: string;
  event_id: string;
  name: string;
  phone: string;
  social_media: string;
  address: string;
  payment_key: string;
  payment_name: string;
  payment_type: string;
  payment_size: number;
  status: "pending" | "verified";
  created_at: string;
};

export const EVENT_COLUMNS = "id,slug,name,event_date,location,quota,fee,bank_name,bank_account_number,bank_account_name,confirmation_whatsapp,active,created_at";
export const PARTICIPANT_COLUMNS = "id,event_id,name,phone,social_media,address,payment_key,payment_name,payment_type,payment_size,status,created_at";

export function mapEvent(row: EventRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    eventDate: row.event_date,
    location: row.location,
    quota: row.quota,
    fee: row.fee,
    bankName: row.bank_name,
    bankAccountNumber: row.bank_account_number,
    bankAccountName: row.bank_account_name,
    confirmationWhatsapp: row.confirmation_whatsapp,
    active: row.active,
    createdAt: row.created_at,
  };
}

export function mapParticipant(row: ParticipantRow) {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    phone: row.phone,
    socialMedia: row.social_media,
    address: row.address,
    paymentKey: row.payment_key,
    paymentName: row.payment_name,
    paymentType: row.payment_type,
    paymentSize: row.payment_size,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function supabaseError(context: string, error: { message: string; code?: string }) {
  return Object.assign(new Error(`${context}: ${error.message}`), { code: error.code });
}

export function isUniqueViolation(error: unknown) {
  return Boolean(
    error
      && typeof error === "object"
      && (("code" in error && error.code === "23505")
        || ("message" in error && String(error.message).includes("duplicate key value"))),
  );
}
