-- Run this on your Vercel/production Postgres (Neon, Supabase, etc.)
-- after deploying API changes. TypeORM synchronize is OFF in production.

-- KYC on users
DO $$ BEGIN
  CREATE TYPE users_kycstatus_enum AS ENUM ('none', 'pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS "kycStatus" users_kycstatus_enum DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS "aadhaarHash" varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "aadhaarLast4" varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "aadhaarName" varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "kycVerifiedAt" timestamp;

-- Booking request fields
DO $$ BEGIN
  CREATE TYPE bookings_requesttype_enum AS ENUM ('direct', 'broadcast');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "requestType" bookings_requesttype_enum DEFAULT 'direct';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "requestGroupId" varchar;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "driverLatitude" decimal(10,7);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "driverLongitude" decimal(10,7);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "arrivedAt" timestamp;

-- New booking status for charging session flow
ALTER TYPE bookings_status_enum ADD VALUE IF NOT EXISTS 'at_station';
