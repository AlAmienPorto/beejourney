ALTER TABLE "participants"
ADD COLUMN IF NOT EXISTS "attended" boolean DEFAULT false NOT NULL;

NOTIFY pgrst, 'reload schema';
