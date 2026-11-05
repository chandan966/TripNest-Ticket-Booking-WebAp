import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sql } from "../../../lib/db.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function respond(data, status = 200) {
  return Response.json(data, { status });
}

function getSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }
  return process.env.JWT_SECRET;
}

function getUser(request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
}

function bookingCode() {
  return `TN${Date.now().toString(36).toUpperCase()}${randomBytes(3).toString("hex").toUpperCase()}`;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function bodyOf(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function handle(request, context) {
  const { segments = [] } = await context.params;
  const route = segments.join("/");
  const method = request.method;

  if (route === "health" && method === "GET") {
    if (!process.env.DATABASE_URL) {
      return respond({ status: "configuration_required", database: "not_configured", app: "TripNest API" }, 503);
    }
    await sql`SELECT 1`;
    return respond({ status: "ok", database: "connected", app: "TripNest API" });
  }

  if (route === "locations" && method === "GET") {
    const rows = await sql`
      SELECT city FROM (
        SELECT origin AS city FROM trips
        UNION
        SELECT destination AS city FROM trips
      ) locations
      ORDER BY city`;
    return respond(rows.map((row) => row.city));
  }

  if (route === "trips" && method === "GET") {
    const params = new URL(request.url).searchParams;
    const from = params.get("from");
    const to = params.get("to");
    const date = params.get("date");
    const type = params.get("type");
    if (date && !isValidDate(date)) return respond({ error: "Date must use YYYY-MM-DD format." }, 400);
    const rows = await sql`
      SELECT t.*,
        GREATEST(0, t.total_seats - COALESCE((
          SELECT SUM(b.seats) FROM bookings b
          WHERE b.trip_id = t.id AND b.status = 'confirmed'
        ), 0))::int AS seats_available,
        COALESCE((
          SELECT jsonb_agg(seat.value)
          FROM bookings b
          CROSS JOIN LATERAL jsonb_array_elements_text(b.selected_seats) AS seat(value)
          WHERE b.trip_id = t.id AND b.status = 'confirmed'
        ), '[]'::jsonb) AS booked_seats
      FROM trips t
      WHERE (${from}::text IS NULL OR lower(t.origin) = lower(${from}))
        AND (${to}::text IS NULL OR lower(t.destination) = lower(${to}))
        AND (${date}::date IS NULL OR t.travel_date = ${date}::date)
        AND (${type}::text IS NULL OR t.type = ${type})
      ORDER BY t.departure_time, t.price`;
    return respond(rows);
  }

  if (route.startsWith("trips/") && method === "GET") {
    const id = Number(route.slice("trips/".length));
    if (!Number.isInteger(id) || id < 1) return respond({ error: "Trip not found." }, 404);
    const rows = await sql`
      SELECT t.*,
        GREATEST(0, t.total_seats - COALESCE((
          SELECT SUM(b.seats) FROM bookings b
          WHERE b.trip_id = t.id AND b.status = 'confirmed'
        ), 0))::int AS seats_available,
        COALESCE((
          SELECT jsonb_agg(seat.value)
          FROM bookings b
          CROSS JOIN LATERAL jsonb_array_elements_text(b.selected_seats) AS seat(value)
          WHERE b.trip_id = t.id AND b.status = 'confirmed'
        ), '[]'::jsonb) AS booked_seats
      FROM trips t WHERE t.id = ${id}`;
    return rows[0] ? respond(rows[0]) : respond({ error: "Trip not found." }, 404);
  }

  if (route === "auth/register" && method === "POST") {
    const { name, email, password } = await bodyOf(request);
    if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim() || typeof password !== "string") {
      return respond({ error: "Name, email, and password are required." }, 400);
    }
    if (password.length < 8) return respond({ error: "Password must be at least 8 characters." }, 400);
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return respond({ error: "Enter a valid email address." }, 400);
    const passwordHash = await bcrypt.hash(password, 12);
    try {
      const rows = await sql`
        INSERT INTO users (name, email, password_hash)
        VALUES (${name.trim()}, ${normalizedEmail}, ${passwordHash})
        RETURNING id, name, email, role`;
      const user = rows[0];
      return respond({ token: jwt.sign(user, getSecret(), { expiresIn: "7d" }), user }, 201);
    } catch (error) {
      if (error.code === "23505") return respond({ error: "An account with this email already exists." }, 409);
      throw error;
    }
  }

  if (route === "auth/login" && method === "POST") {
    const { email, password } = await bodyOf(request);
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return respond({ error: "Email and password are required." }, 400);
    }
    const rows = await sql`
      SELECT id, name, email, role, password_hash
      FROM users WHERE email = ${email.trim().toLowerCase()}`;
    const row = rows[0];
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      return respond({ error: "Incorrect email or password." }, 401);
    }
    const user = { id: row.id, name: row.name, email: row.email, role: row.role };
    return respond({ token: jwt.sign(user, getSecret(), { expiresIn: "7d" }), user });
  }

  if (route === "auth/me" && method === "GET") {
    const user = getUser(request);
    if (!user) return respond({ error: "Session expired. Please sign in again." }, 401);
    const rows = await sql`SELECT id, name, email, role, created_at FROM users WHERE id = ${user.id}`;
    return rows[0] ? respond({ user: rows[0] }) : respond({ error: "Account not found." }, 404);
  }

  if (route === "bookings" && method === "POST") {
    const user = getUser(request);
    if (!user) return respond({ error: "Please sign in to continue." }, 401);
    const bookingRequest = await bodyOf(request);
    const { tripId, seats, passengers } = bookingRequest;
    const count = Number(seats);
    if (!Number.isInteger(Number(tripId)) || Number(tripId) < 1) return respond({ error: "Choose a valid trip." }, 400);
    if (!Number.isInteger(count) || count < 1 || count > 6) return respond({ error: "Choose between 1 and 6 seats." }, 400);
    if (!Array.isArray(passengers) || passengers.length !== count ||
      passengers.some((passenger) => typeof passenger?.name !== "string" || !passenger.name.trim() ||
        !Number.isInteger(Number(passenger.age)) || Number(passenger.age) < 1 || Number(passenger.age) > 120)) {
      return respond({ error: "Enter a name and valid age for every passenger." }, 400);
    }
    const selectedSeats = Array.isArray(bookingRequest.seatCodes) ? bookingRequest.seatCodes.map(String) : [];
    if (selectedSeats.length && (selectedSeats.length !== count || new Set(selectedSeats).size !== count ||
      selectedSeats.some((seat) => !/^[A-Z]\d{1,2}$/.test(seat)))) {
      return respond({ error: "Select one unique valid seat for each traveller." }, 400);
    }
    const { boardingPoint = null, droppingPoint = null, paymentMethod = "demo", couponCode = "" } = bookingRequest;
    if (!["demo", "upi_test", "card_test", "netbanking_test", "wallet_demo"].includes(paymentMethod)) {
      return respond({ error: "Choose an available demo payment option." }, 400);
    }
    const normalizedCoupon = String(couponCode).trim().toUpperCase();
    const discountRate = normalizedCoupon === "TRIPNEST10" ? 0.1 : normalizedCoupon === "NEST5" ? 0.05 : 0;
    if (normalizedCoupon && !discountRate) return respond({ error: "That demo offer code is not valid." }, 400);
    const tripRows = await sql`SELECT boarding_points, dropping_points FROM trips WHERE id = ${Number(tripId)}`;
    if (!tripRows[0]) return respond({ error: "Trip not found." }, 404);
    if (boardingPoint && !tripRows[0].boarding_points.includes(boardingPoint)) {
      return respond({ error: "Choose a listed boarding point." }, 400);
    }
    if (droppingPoint && !tripRows[0].dropping_points.includes(droppingPoint)) {
      return respond({ error: "Choose a listed dropping point." }, 400);
    }
    const code = bookingCode();
    const rows = await sql`
      WITH selected_trip AS MATERIALIZED (
        SELECT * FROM trips WHERE id = ${Number(tripId)} FOR UPDATE
      ),
      inserted AS (
        INSERT INTO bookings (booking_code, user_id, trip_id, seats, total_amount, passengers_json,
          selected_seats, boarding_point, dropping_point, payment_method, payment_status, coupon_code, discount_amount)
        SELECT ${code}, ${user.id}, t.id, ${count},
          round(t.price * ${count} * (1 - ${discountRate}), 2), ${JSON.stringify(passengers)}::jsonb,
          ${JSON.stringify(selectedSeats)}::jsonb, ${boardingPoint}, ${droppingPoint}, ${paymentMethod},
          'demo_only', ${normalizedCoupon || null}, round(t.price * ${count} * ${discountRate}, 2)
        FROM selected_trip t
        WHERE t.travel_date >= CURRENT_DATE
          AND (${boardingPoint}::text IS NULL OR t.boarding_points @> jsonb_build_array(${boardingPoint}))
          AND (${droppingPoint}::text IS NULL OR t.dropping_points @> jsonb_build_array(${droppingPoint}))
          AND t.total_seats - COALESCE((
            SELECT SUM(b.seats) FROM bookings b
            WHERE b.trip_id = t.id AND b.status = 'confirmed'
          ), 0) >= ${count}
          AND NOT EXISTS (
            SELECT 1 FROM bookings b
            CROSS JOIN LATERAL jsonb_array_elements_text(b.selected_seats) AS seat(value)
            WHERE b.trip_id = t.id AND b.status = 'confirmed'
              AND seat.value IN (
                SELECT jsonb_array_elements_text(${JSON.stringify(selectedSeats)}::jsonb)
              )
          )
        RETURNING *
      )
      SELECT b.*, t.origin, t.destination, t.travel_date, t.departure_time, t.arrival_time, t.operator, t.type
      FROM inserted b JOIN trips t ON t.id = b.trip_id`;
    if (!rows[0]) {
      const trips = await sql`SELECT travel_date FROM trips WHERE id = ${Number(tripId)}`;
      if (!trips[0]) return respond({ error: "Trip not found." }, 404);
      if (new Date(trips[0].travel_date) < new Date(new Date().toISOString().slice(0, 10))) {
        return respond({ error: "This trip date has passed." }, 400);
      }
      return respond({ error: "Not enough seats are available. Search again for updated availability." }, 409);
    }
    return respond({ booking: rows[0] }, 201);
  }

  if (route === "bookings/mine" && method === "GET") {
    const user = getUser(request);
    if (!user) return respond({ error: "Please sign in to continue." }, 401);
    const rows = await sql`
      SELECT b.*, t.origin, t.destination, t.travel_date, t.departure_time, t.arrival_time,
        t.operator, t.type, t.duration, b.passengers_json AS passengers
      FROM bookings b JOIN trips t ON t.id = b.trip_id
      WHERE b.user_id = ${user.id} ORDER BY b.created_at DESC`;
    return respond(rows);
  }

  if (route.startsWith("bookings/") && method === "GET") {
    const user = getUser(request);
    if (!user) return respond({ error: "Please sign in to continue." }, 401);
    const code = route.slice("bookings/".length);
    const rows = await sql`
      SELECT b.*, t.origin, t.destination, t.travel_date, t.departure_time, t.arrival_time,
        t.operator, t.type, t.duration, b.passengers_json AS passengers
      FROM bookings b JOIN trips t ON t.id = b.trip_id
      WHERE b.booking_code = ${code} AND b.user_id = ${user.id}`;
    return rows[0] ? respond(rows[0]) : respond({ error: "Booking not found." }, 404);
  }

  if (route.startsWith("bookings/") && route.endsWith("/cancel") && method === "POST") {
    const user = getUser(request);
    if (!user) return respond({ error: "Please sign in to continue." }, 401);
    const code = route.split("/")[1];
    const rows = await sql`
      UPDATE bookings b SET status = 'cancelled', cancelled_at = now(), refund_status = 'demo_not_processed'
      FROM trips t
      WHERE b.trip_id = t.id AND b.booking_code = ${code} AND b.user_id = ${user.id}
        AND b.status = 'confirmed' AND t.travel_date > CURRENT_DATE
      RETURNING b.booking_code`;
    if (rows[0]) return respond({ message: "Booking cancelled.", bookingCode: rows[0].booking_code });
    const existing = await sql`SELECT status FROM bookings WHERE booking_code = ${code} AND user_id = ${user.id}`;
    if (!existing[0]) return respond({ error: "Booking not found." }, 404);
    if (existing[0].status === "cancelled") return respond({ error: "This booking is already cancelled." }, 409);
    return respond({ error: "Bookings for today's or past trips cannot be cancelled online." }, 400);
  }

  if (route.startsWith("bookings/") && route.endsWith("/reschedule") && method === "POST") {
    const user = getUser(request);
    if (!user) return respond({ error: "Please sign in to continue." }, 401);
    const code = route.split("/")[1];
    const { travelDate } = await bodyOf(request);
    if (!isValidDate(travelDate) || travelDate < new Date().toISOString().slice(0, 10)) {
      return respond({ error: "Choose a valid future travel date." }, 400);
    }
    const rows = await sql`
      UPDATE bookings b SET rescheduled_to = ${travelDate}::date
      FROM trips t
      WHERE b.trip_id = t.id AND b.booking_code = ${code} AND b.user_id = ${user.id}
        AND b.status = 'confirmed' AND t.travel_date > CURRENT_DATE
      RETURNING b.booking_code, b.rescheduled_to`;
    if (rows[0]) return respond({ ...rows[0], demo: true });
    const existing = await sql`SELECT status FROM bookings WHERE booking_code = ${code} AND user_id = ${user.id}`;
    if (!existing[0]) return respond({ error: "Booking not found." }, 404);
    return respond({ error: "This booking cannot be rescheduled." }, 400);
  }

  if (route.startsWith("tracking/") && method === "GET") {
    const user = getUser(request);
    if (!user) return respond({ error: "Please sign in to continue." }, 401);
    const code = route.slice("tracking/".length);
    const rows = await sql`
      SELECT b.booking_code, b.status, t.origin, t.destination, t.departure_time, t.travel_date, t.type
      FROM bookings b JOIN trips t ON t.id = b.trip_id
      WHERE b.booking_code = ${code} AND b.user_id = ${user.id}`;
    if (!rows[0]) return respond({ error: "Booking not found." }, 404);
    return respond({
      ...rows[0],
      demo: true,
      location: `${rows[0].origin} highway`,
      eta: "About 45 minutes",
      updatedAt: new Date().toISOString(),
      message: "Sample tracking only; no live vehicle location is available.",
    });
  }

  if (route === "admin/bookings" && method === "GET") {
    const user = getUser(request);
    if (!user) return respond({ error: "Please sign in to continue." }, 401);
    if (user.role !== "admin") return respond({ error: "Admin access required." }, 403);
    const rows = await sql`
      SELECT b.booking_code, b.seats, b.total_amount, b.status, b.created_at,
        u.name AS customer, u.email, t.origin, t.destination, t.travel_date, t.operator
      FROM bookings b JOIN users u ON u.id = b.user_id JOIN trips t ON t.id = b.trip_id
      ORDER BY b.created_at DESC LIMIT 500`;
    return respond(rows);
  }

  if (route === "admin/trips" && method === "POST") {
    const user = getUser(request);
    if (!user) return respond({ error: "Please sign in to continue." }, 401);
    if (user.role !== "admin") return respond({ error: "Admin access required." }, 403);
    const trip = await bodyOf(request);
    const required = ["type", "origin", "destination", "travel_date", "departure_time", "arrival_time", "operator", "price", "duration", "total_seats"];
    if (required.some((key) => trip[key] === undefined || trip[key] === "") ||
      !["bus", "train", "flight"].includes(trip.type) || !isValidDate(trip.travel_date) ||
      !Number.isFinite(Number(trip.price)) || Number(trip.price) <= 0 ||
      !Number.isInteger(Number(trip.total_seats)) || Number(trip.total_seats) < 1) {
      return respond({ error: "Provide valid trip details." }, 400);
    }
    const rows = await sql`
      INSERT INTO trips (type, origin, destination, travel_date, departure_time, arrival_time,
        operator, price, duration, total_seats, amenities)
      VALUES (${trip.type}, ${String(trip.origin).trim()}, ${String(trip.destination).trim()},
        ${trip.travel_date}, ${trip.departure_time}, ${trip.arrival_time}, ${String(trip.operator).trim()},
        ${Number(trip.price)}, ${String(trip.duration)}, ${Number(trip.total_seats)}, ${String(trip.amenities || "Standard")})
      RETURNING id`;
    return respond({ id: rows[0].id, message: "Trip created." }, 201);
  }

  return respond({ error: "Not found." }, 404);
}

async function route(request, context) {
  try {
    if (!process.env.DATABASE_URL) {
      return respond({ error: "Database not configured. Add DATABASE_URL to your environment." }, 503);
    }
    return await handle(request, context);
  } catch (error) {
    console.error("TripNest API request failed:", error);
    if (error.message === "JWT_SECRET is not configured.") {
      return respond({ error: "Authentication is not configured. Add JWT_SECRET to your environment." }, 503);
    }
    return respond({ error: "The request could not be completed. Check the server configuration and try again." }, 500);
  }
}

export { route as GET, route as POST, route as PATCH, route as DELETE };
