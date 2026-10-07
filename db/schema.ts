import { index, integer, pgTable, text, uniqueIndex, boolean, timestamp } from "drizzle-orm/pg-core";

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    slug: text("slug"),
    name: text("name").notNull(),
    eventDate: text("event_date").notNull(),
    location: text("location").notNull(),
    quota: integer("quota").notNull().default(30),
    fee: integer("fee").notNull().default(80000),
    bankName: text("bank_name").notNull().default("BCA"),
    bankAccountNumber: text("bank_account_number").notNull().default("2380842940"),
    bankAccountName: text("bank_account_name").notNull().default("Izza Riskuna Sa'adah"),
    confirmationWhatsapp: text("confirmation_whatsapp").notNull().default(""),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("idx_events_active_date").on(table.active, table.eventDate),
    uniqueIndex("idx_events_slug_unique").on(table.slug),
  ]
);

export const participants = pgTable(
  "participants",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    socialMedia: text("social_media").notNull(),
    address: text("address").notNull(),
    paymentKey: text("payment_key").notNull(),
    paymentName: text("payment_name").notNull(),
    paymentType: text("payment_type").notNull(),
    paymentSize: integer("payment_size").notNull(),
    status: text("status", { enum: ["pending", "verified"] }).notNull().default("pending"),
    attended: boolean("attended").notNull().default(false),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("idx_participants_event_created").on(table.eventId, table.createdAt),
    index("idx_participants_event_status").on(table.eventId, table.status),
    uniqueIndex("idx_participants_event_phone_unique").on(table.eventId, table.phone),
  ]
);
