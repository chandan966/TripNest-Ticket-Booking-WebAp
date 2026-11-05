import { neon } from "@neondatabase/serverless";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  throw new Error("Set DATABASE_URL before initializing the Neon database.");
}

const sql = neon(process.env.DATABASE_URL);
await sql`
  CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
await sql`
  CREATE TABLE IF NOT EXISTS trips (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('bus', 'train', 'flight')),
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    travel_date DATE NOT NULL,
    departure_time TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    operator TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
    duration TEXT NOT NULL,
    total_seats INTEGER NOT NULL DEFAULT 40 CHECK (total_seats > 0),
    amenities TEXT NOT NULL DEFAULT 'Standard',
    bus_type TEXT NOT NULL DEFAULT 'Standard',
    rating NUMERIC(2, 1) NOT NULL DEFAULT 4.5,
    review_count INTEGER NOT NULL DEFAULT 0,
    women_friendly BOOLEAN NOT NULL DEFAULT false,
    is_primo BOOLEAN NOT NULL DEFAULT false,
    supports_tracking BOOLEAN NOT NULL DEFAULT false,
    boarding_points JSONB NOT NULL DEFAULT '[]'::jsonb,
    dropping_points JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
await sql`
  CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    booking_code TEXT NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id),
    trip_id BIGINT NOT NULL REFERENCES trips(id),
    seats INTEGER NOT NULL CHECK (seats > 0),
    total_amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
    passengers_json JSONB NOT NULL,
    selected_seats JSONB NOT NULL DEFAULT '[]'::jsonb,
    boarding_point TEXT,
    dropping_point TEXT,
    payment_method TEXT NOT NULL DEFAULT 'demo',
    payment_status TEXT NOT NULL DEFAULT 'demo_only',
    refund_status TEXT NOT NULL DEFAULT 'not_applicable',
    coupon_code TEXT,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    rescheduled_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelled_at TIMESTAMPTZ
  )`;
for (const statement of [
  "ALTER TABLE trips ADD COLUMN IF NOT EXISTS bus_type TEXT NOT NULL DEFAULT 'Standard'",
  "ALTER TABLE trips ADD COLUMN IF NOT EXISTS rating NUMERIC(2, 1) NOT NULL DEFAULT 4.5",
  "ALTER TABLE trips ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE trips ADD COLUMN IF NOT EXISTS women_friendly BOOLEAN NOT NULL DEFAULT false",
  "ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_primo BOOLEAN NOT NULL DEFAULT false",
  "ALTER TABLE trips ADD COLUMN IF NOT EXISTS supports_tracking BOOLEAN NOT NULL DEFAULT false",
  "ALTER TABLE trips ADD COLUMN IF NOT EXISTS boarding_points JSONB NOT NULL DEFAULT '[]'::jsonb",
  "ALTER TABLE trips ADD COLUMN IF NOT EXISTS dropping_points JSONB NOT NULL DEFAULT '[]'::jsonb",
  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS selected_seats JSONB NOT NULL DEFAULT '[]'::jsonb",
  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS boarding_point TEXT",
  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dropping_point TEXT",
  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'demo'",
  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'demo_only'",
  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_status TEXT NOT NULL DEFAULT 'not_applicable'",
  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS coupon_code TEXT",
  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0",
  "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rescheduled_to DATE",
]) {
  await sql.query(statement);
}
await sql`CREATE INDEX IF NOT EXISTS idx_trips_search ON trips(origin, destination, travel_date, type)`;
await sql`CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id, created_at)`;

const [{ count }] = await sql`SELECT count(*)::int AS count FROM trips`;
if (count === 0) {
  const sample = [
    ["bus", "Pune", "Mumbai", 1, "06:15", "10:00", "Neeta Travels", 499, "3h 45m", 40, "AC Sleeper · Charging"],
    ["bus", "Pune", "Mumbai", 1, "08:30", "12:15", "Purple Bus", 649, "3h 45m", 36, "AC Seater · Wi-Fi"],
    ["bus", "Mumbai", "Pune", 1, "17:00", "21:00", "Shivneri Express", 550, "4h", 40, "AC Seater"],
    ["train", "Mumbai", "Pune", 2, "07:10", "10:45", "Deccan Queen", 235, "3h 35m", 72, "Chair Car · Pantry"],
    ["train", "Pune", "Hyderabad", 3, "21:30", "08:15", "Hussain Sagar Express", 680, "10h 45m", 80, "Sleeper · Pantry"],
    ["flight", "Mumbai", "Delhi", 2, "09:20", "11:35", "IndiGo", 4299, "2h 15m", 180, "Cabin bag · In-flight service"],
    ["flight", "Pune", "Bengaluru", 4, "14:10", "15:45", "Akasa Air", 3499, "1h 35m", 150, "Cabin bag · Snacks available"],
    ["bus", "Mumbai", "Goa", 5, "20:00", "07:30", "IntrCity SmartBus", 1199, "11h 30m", 36, "AC Sleeper · Live tracking"],
    ["train", "Pune", "Nagpur", 4, "18:25", "07:40", "Maharashtra Express", 420, "13h 15m", 72, "Sleeper · Pantry"],
    ["bus", "Pune", "Nashik", 2, "09:00", "13:00", "MSRTC Shivai", 390, "4h", 40, "AC Seater"],
    ["flight", "Delhi", "Mumbai", 3, "18:45", "21:00", "Air India Express", 5199, "2h 15m", 180, "Cabin bag · Refreshments"],
    ["train", "Mumbai", "Goa", 6, "23:10", "10:30", "Konkan Kanya Express", 760, "11h 20m", 72, "Sleeper · Pantry"],
  ];
  for (const [type, origin, destination, offset, departure, arrival, operator, price, duration, seats, amenities] of sample) {
    await sql`
      INSERT INTO trips (type, origin, destination, travel_date, departure_time, arrival_time,
        operator, price, duration, total_seats, amenities)
      VALUES (${type}, ${origin}, ${destination}, CURRENT_DATE + ${offset}, ${departure}, ${arrival},
        ${operator}, ${price}, ${duration}, ${seats}, ${amenities})`;
  }
}
await sql`
  UPDATE trips SET
    bus_type = CASE
      WHEN type <> 'bus' THEN 'Standard'
      WHEN amenities ILIKE '%sleeper%' THEN 'AC Sleeper'
      WHEN amenities ILIKE '%AC%' THEN 'AC Seater'
      ELSE 'Non-AC Seater'
    END,
    rating = 4.2 + ((id % 8)::numeric / 10),
    review_count = 64 + (id * 17)::int,
    women_friendly = id % 2 = 0,
    is_primo = type = 'bus' AND id % 3 = 0,
    supports_tracking = type = 'bus',
    boarding_points = CASE WHEN boarding_points = '[]'::jsonb
      THEN jsonb_build_array(origin || ' Central', origin || ' Station') ELSE boarding_points END,
    dropping_points = CASE WHEN dropping_points = '[]'::jsonb
      THEN jsonb_build_array(destination || ' Central', destination || ' Station') ELSE dropping_points END`;

console.log("Neon schema is ready and demo trips are seeded.");
