const path = require("path");
const { randomBytes } = require("node:crypto");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./src/db");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "tripnest_super_secret_production_key_2026_redbus_style_booking";
const frontendDist = path.join(__dirname, "..", "frontend", "dist");

// Allowed origins
const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN || "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(null, true); // Allow same host
    },
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));

// Security Headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://fonts.gstatic.com data: blob:;"
  );
  next();
});

// Serve frontend static build
app.use(express.static(frontendDist));

// In-memory sliding rate limiter
const rateLimitBuckets = new Map();
function rateLimit({ limit, windowMs }) {
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    let bucket = rateLimitBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      rateLimitBuckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
    }
    if (rateLimitBuckets.size > 5000) {
      for (const [address, entry] of rateLimitBuckets) {
        if (entry.resetAt <= now) rateLimitBuckets.delete(address);
      }
    }
    next();
  };
}

const authRateLimit = rateLimit({ limit: 30, windowMs: 15 * 60 * 1000 });
const bookingRateLimit = rateLimit({ limit: 60, windowMs: 60 * 1000 });

function getJwtSecret() {
  if (!JWT_SECRET || JWT_SECRET.length < 16) {
    return "tripnest_fallback_secure_jwt_token_secret_key_32chars_long";
  }
  return JWT_SECRET;
}

function createToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Please sign in to continue." });
  try {
    req.user = jwt.verify(token, getJwtSecret());
    next();
  } catch {
    return res.status(401).json({ error: "Session expired. Please sign in again." });
  }
}

function admin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function indiaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function validSeatCodes(value, totalSeats = 60) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6 || new Set(value).size !== value.length) {
    return false;
  }
  return value.every(seat => typeof seat === "string" && /^[LU]?[A-Z]\d{1,2}$/.test(seat));
}

function bookingCode() {
  return "TN" + Date.now().toString(36).toUpperCase() + randomBytes(3).toString("hex").toUpperCase();
}

function supportCode() {
  return "SUP-" + randomBytes(4).toString("hex").toUpperCase();
}

function createNotification(userId, title, message, type, bookingCodeValue = null, ticketId = null) {
  try {
    db.prepare(
      "INSERT INTO notifications (user_id, title, message, type, booking_code, support_ticket_id) VALUES (?,?,?,?,?,?)"
    ).run(userId, title, message, type, bookingCodeValue, ticketId);
  } catch (err) {
    console.error("Failed to insert notification:", err.message);
  }
}

// ----------------------------------------------------
// Public APIs
// ----------------------------------------------------

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database: "connected",
    app: "TripNest Ticket Booking Pro",
    version: "2.0.0",
    time: new Date().toISOString()
  });
});

app.get("/api/locations", (req, res) => {
  const rows = db
    .prepare("SELECT DISTINCT origin AS city FROM trips UNION SELECT DISTINCT destination AS city FROM trips ORDER BY city")
    .all();
  res.json(rows.map(r => r.city));
});

app.get("/api/offers", (req, res) => {
  const today = indiaDate();
  const offers = db
    .prepare(
      `SELECT code, discount_type, discount_value, minimum_amount, maximum_discount, description, expires_at
       FROM coupons WHERE active = 1 AND (starts_at IS NULL OR starts_at <= ?) AND (expires_at IS NULL OR expires_at >= ?)
       ORDER BY discount_value DESC, code ASC`
    )
    .all(today, today);

  res.json(
    offers.map(offer => ({
      ...offer,
      discount_label: offer.discount_type === "percentage" ? `${offer.discount_value}% OFF` : `₹${offer.discount_value} OFF`
    }))
  );
});

// Trip availability query helper
function tripAvailabilityQuery(whereClause = "", params = [], orderBy = "t.departure_time ASC, t.price ASC") {
  const sql = `
    SELECT
      t.*,
      CASE
        WHEN t.total_seats - COALESCE(bt.seats_booked, 0) - COALESCE(ht.seats_held, 0) > 0
        THEN t.total_seats - COALESCE(bt.seats_booked, 0) - COALESCE(ht.seats_held, 0)
        ELSE 0
      END AS seats_available,
      COALESCE(bt.selected_seats_json, '[]') AS booked_seats_json,
      COALESCE(ht.held_seats_json, '[]') AS held_seats_json
    FROM trips t
    LEFT JOIN (
      SELECT trip_id, SUM(seats) AS seats_booked,
        '[' || COALESCE(group_concat(trim(selected_seats_json, '[]')), '') || ']' AS selected_seats_json
      FROM bookings
      WHERE status = 'confirmed'
      GROUP BY trip_id
    ) bt ON bt.trip_id = t.id
    LEFT JOIN (
      SELECT trip_id, COUNT(*) AS seats_held,
        '[' || COALESCE(group_concat('"' || seat_code || '"'), '') || ']' AS held_seats_json
      FROM seat_holds WHERE expires_at > unixepoch()
      GROUP BY trip_id
    ) ht ON ht.trip_id = t.id
    ${whereClause}
    ORDER BY ${orderBy}
  `;

  return db.prepare(sql).all(...params).map(row => {
    let bookedSeats = [];
    let heldSeats = [];
    try {
      bookedSeats = JSON.parse(row.booked_seats_json || "[]").filter(Boolean);
    } catch {}
    try {
      heldSeats = JSON.parse(row.held_seats_json || "[]").filter(Boolean);
    } catch {}

    const parseJson = (json, fallback) => {
      try {
        const val = JSON.parse(json || "[]");
        return Array.isArray(val) && val.length ? val : fallback;
      } catch {
        return fallback;
      }
    };

    const { booked_seats_json, held_seats_json, ...trip } = row;
    return {
      ...trip,
      boarding_points: parseJson(trip.boarding_points_json, [
        { name: `${trip.origin} Central Bus Station`, time: trip.departure_time, landmark: "Main Platform" }
      ]),
      dropping_points: parseJson(trip.dropping_points_json, [
        { name: `${trip.destination} Central Terminal`, time: trip.arrival_time, landmark: "Arrival Platform" }
      ]),
      cancellation_policy: parseJson(trip.cancellation_policy_json, [
        { timeframe: "Before 24h", refundPercent: "90% refund" },
        { timeframe: "12 to 24h", refundPercent: "70% refund" },
        { timeframe: "Under 12h", refundPercent: "No refund" }
      ]),
      booked_seats: bookedSeats,
      held_seats: heldSeats
    };
  });
}

// ----------------------------------------------------
// Trips Search
// ----------------------------------------------------

app.get("/api/trips", (req, res) => {
  const {
    from,
    to,
    date,
    type,
    busType,
    maxFare,
    departureWindow,
    womenFriendly,
    primoOnly,
    hasTracking,
    sortBy
  } = req.query;

  if (date && !validDate(date)) {
    return res.status(400).json({ error: "Date must use YYYY-MM-DD format." });
  }

  const whereClauses = [];
  const params = [];

  if (from) {
    whereClauses.push("lower(t.origin) = lower(?)");
    params.push(String(from).trim());
  }
  if (to) {
    whereClauses.push("lower(t.destination) = lower(?)");
    params.push(String(to).trim());
  }
  if (date) {
    whereClauses.push("t.travel_date = ?");
    params.push(String(date));
  }
  if (type && ["bus", "train", "flight"].includes(String(type))) {
    whereClauses.push("t.type = ?");
    params.push(String(type));
  }
  if (busType && busType !== "all") {
    whereClauses.push("t.bus_type LIKE ?");
    params.push(`%${busType}%`);
  }
  if (maxFare && maxFare !== "all" && !Number.isNaN(Number(maxFare))) {
    whereClauses.push("t.price <= ?");
    params.push(Number(maxFare));
  }
  if (womenFriendly === "true" || womenFriendly === "1") {
    whereClauses.push("t.women_friendly = 1");
  }
  if (primoOnly === "true" || primoOnly === "1") {
    whereClauses.push("t.is_primo = 1");
  }
  if (hasTracking === "true" || hasTracking === "1") {
    whereClauses.push("t.supports_tracking = 1");
  }

  let orderBy = "t.departure_time ASC, t.price ASC";
  if (sortBy === "price_asc" || sortBy === "price") {
    orderBy = "t.price ASC";
  } else if (sortBy === "price_desc") {
    orderBy = "t.price DESC";
  } else if (sortBy === "departure_asc" || sortBy === "departure") {
    orderBy = "t.departure_time ASC";
  } else if (sortBy === "rating_desc" || sortBy === "rating") {
    orderBy = "t.rating DESC, t.review_count DESC";
  } else if (sortBy === "duration_asc") {
    orderBy = "t.duration ASC";
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
  let trips = tripAvailabilityQuery(whereSql, params, orderBy);

  // Filter departure time window in memory if specified
  if (departureWindow && departureWindow !== "all") {
    trips = trips.filter(t => {
      const hour = Number(String(t.departure_time).split(":")[0]);
      if (departureWindow === "early_morning") return hour < 6;
      if (departureWindow === "morning") return hour >= 6 && hour < 12;
      if (departureWindow === "afternoon") return hour >= 12 && hour < 18;
      if (departureWindow === "night") return hour >= 18;
      return true;
    });
  }

  res.json(trips);
});

app.get("/api/trips/:id", (req, res) => {
  const trip = tripAvailabilityQuery("WHERE t.id = ?", [Number(req.params.id)])[0];
  if (!trip) return res.status(404).json({ error: "Trip not found." });
  res.json(trip);
});

// ----------------------------------------------------
// Authentication
// ----------------------------------------------------

app.post("/api/auth/register", authRateLimit, async (req, res) => {
  const { name, email, password, phone } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const result = db
      .prepare("INSERT INTO users (name, email, password_hash, role, phone, created_at) VALUES (?, ?, ?, 'user', ?, CURRENT_TIMESTAMP)")
      .run(name.trim(), normalizedEmail, hash, phone ? String(phone).trim() : null);

    const user = db.prepare("SELECT id, name, email, role, phone FROM users WHERE id = ?").get(result.lastInsertRowid);
    createNotification(user.id, "Welcome to TripNest!", "Explore top-rated Redbus-style trips with live seat holding, e-tickets, and live bus tracking.", "account");
    res.status(201).json({ token: createToken(user), user });
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    console.error("Register error:", error);
    res.status(500).json({ error: "Could not create account. Please try again." });
  }
});

app.post("/api/auth/login", authRateLimit, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const userRow = db.prepare("SELECT * FROM users WHERE email = ?").get(String(email).trim().toLowerCase());
  if (!userRow || !(await bcrypt.compare(password, userRow.password_hash))) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  const user = {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    role: userRow.role,
    phone: userRow.phone
  };
  res.json({ token: createToken(user), user });
});

app.get("/api/auth/me", auth, (req, res) => {
  const user = db.prepare("SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "Account not found." });
  res.json({ user });
});

// ----------------------------------------------------
// Seat Hold & Release
// ----------------------------------------------------

app.post("/api/seats/hold", auth, bookingRateLimit, (req, res) => {
  const tripId = Number(req.body?.tripId);
  const seatCodes = req.body?.seatCodes;

  if (!Number.isInteger(tripId) || tripId < 1) {
    return res.status(400).json({ error: "Choose a valid trip." });
  }
  if (!validSeatCodes(seatCodes)) {
    return res.status(400).json({ error: "Select between 1 and 6 valid seats." });
  }

  const holdTx = db.transaction(() => {
    const now = Math.floor(Date.now() / 1000);
    // Remove expired holds
    db.prepare("DELETE FROM seat_holds WHERE expires_at <= ?").run(now);

    const trip = db.prepare("SELECT id, travel_date, total_seats FROM trips WHERE id = ?").get(tripId);
    if (!trip) throw new Error("TRIP_NOT_FOUND");

    // Check if seats already booked
    const booked = new Set(
      db
        .prepare("SELECT selected_seats_json FROM bookings WHERE trip_id = ? AND status = 'confirmed'")
        .all(tripId)
        .flatMap(row => {
          try {
            return JSON.parse(row.selected_seats_json || "[]");
          } catch {
            return [];
          }
        })
    );

    if (seatCodes.some(seat => booked.has(seat))) {
      throw new Error("SEAT_UNAVAILABLE");
    }

    // Check if seats are held by someone else
    const heldByOthers = db
      .prepare(
        `SELECT seat_code FROM seat_holds WHERE trip_id = ? AND user_id != ? AND seat_code IN (${seatCodes.map(() => "?").join(",")})`
      )
      .all(tripId, req.user.id, ...seatCodes);

    if (heldByOthers.length > 0) {
      throw new Error("SEAT_HELD_BY_OTHER");
    }

    // Remove user's previous holds on this trip
    db.prepare("DELETE FROM seat_holds WHERE trip_id = ? AND user_id = ?").run(tripId, req.user.id);

    // Hold for 5 minutes (300 seconds)
    const expiresAt = now + 5 * 60;
    const insert = db.prepare("INSERT INTO seat_holds (trip_id, seat_code, user_id, expires_at) VALUES (?, ?, ?, ?)");
    for (const seat of seatCodes) {
      insert.run(tripId, seat, req.user.id, expiresAt);
    }

    return { expiresAt: expiresAt * 1000, seats: seatCodes };
  });

  try {
    const result = holdTx();
    res.json(result);
  } catch (error) {
    const errorMap = {
      TRIP_NOT_FOUND: [404, "Trip not found."],
      SEAT_UNAVAILABLE: [409, "One or more selected seats are already booked."],
      SEAT_HELD_BY_OTHER: [409, "One or more seats are currently held by another passenger. Please select other seats."]
    };
    if (errorMap[error.message]) {
      return res.status(errorMap[error.message][0]).json({ error: errorMap[error.message][1] });
    }
    console.error("Hold seats error:", error);
    res.status(500).json({ error: "Could not reserve those seats. Please try again." });
  }
});

app.post("/api/seats/release", auth, bookingRateLimit, (req, res) => {
  const tripId = Number(req.body?.tripId);
  const seatCodes = req.body?.seatCodes;

  if (!Number.isInteger(tripId) || tripId < 1) {
    return res.status(400).json({ error: "Choose a valid trip." });
  }

  const released = Array.isArray(seatCodes) && seatCodes.length > 0
    ? db
        .prepare(`DELETE FROM seat_holds WHERE trip_id = ? AND user_id = ? AND seat_code IN (${seatCodes.map(() => "?").join(",")})`)
        .run(tripId, req.user.id, ...seatCodes).changes
    : db.prepare("DELETE FROM seat_holds WHERE trip_id = ? AND user_id = ?").run(tripId, req.user.id).changes;

  res.json({ released });
});

// ----------------------------------------------------
// Bookings Creation & Checkout
// ----------------------------------------------------

app.post("/api/bookings", auth, bookingRateLimit, (req, res) => {
  const {
    tripId,
    seats,
    passengers,
    seatCodes,
    boardingPoint,
    droppingPoint,
    paymentMethod = "upi_demo",
    couponCode = "",
    passengerPhone = "",
    passengerEmail = "",
    insuranceOpted = false
  } = req.body || {};

  const count = Number(seats);
  if (!Number.isInteger(count) || count < 1 || count > 6) {
    return res.status(400).json({ error: "Choose between 1 and 6 seats." });
  }
  if (!Number.isInteger(Number(tripId)) || Number(tripId) < 1) {
    return res.status(400).json({ error: "Choose a valid trip." });
  }
  if (!Array.isArray(passengers) || passengers.length !== count) {
    return res.status(400).json({ error: "Provide full details for each passenger." });
  }

  for (let i = 0; i < passengers.length; i++) {
    const p = passengers[i];
    if (!p.name?.trim()) {
      return res.status(400).json({ error: `Enter passenger ${i + 1}'s full name.` });
    }
    const age = Number(p.age);
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      return res.status(400).json({ error: `Enter a valid age for passenger ${i + 1}.` });
    }
  }

  if (!validSeatCodes(seatCodes) || seatCodes.length !== count) {
    return res.status(400).json({ error: `Select exactly ${count} valid seats.` });
  }

  const createTx = db.transaction(() => {
    const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(Number(tripId));
    if (!trip) throw new Error("TRIP_NOT_FOUND");

    const now = Math.floor(Date.now() / 1000);
    // Verify user owns active holds for these seats
    const ownedHolds = new Set(
      db
        .prepare("SELECT seat_code FROM seat_holds WHERE trip_id = ? AND user_id = ? AND expires_at > ?")
        .all(trip.id, req.user.id, now)
        .map(r => r.seat_code)
    );

    // If hold expired or not present, check if seats are available right now
    const bookedSeats = new Set(
      db
        .prepare("SELECT selected_seats_json FROM bookings WHERE trip_id = ? AND status = 'confirmed'")
        .all(trip.id)
        .flatMap(row => {
          try {
            return JSON.parse(row.selected_seats_json || "[]");
          } catch {
            return [];
          }
        })
    );

    if (seatCodes.some(seat => bookedSeats.has(seat))) {
      throw new Error("SEAT_UNAVAILABLE");
    }

    // Base fare
    const baseFare = Number((trip.price * count).toFixed(2));
    // Travel insurance (₹15 per person)
    const insuranceAmount = insuranceOpted ? 15 * count : 0;
    // GST (5% on bus bookings)
    const gstAmount = Number(((baseFare + insuranceAmount) * 0.05).toFixed(2));
    const subtotal = Number((baseFare + insuranceAmount + gstAmount).toFixed(2));

    // Offer / Coupon calculation
    let discount = 0;
    const normalizedCoupon = (couponCode || "").trim().toUpperCase();
    if (normalizedCoupon) {
      const coupon = db.prepare("SELECT * FROM coupons WHERE code = ? COLLATE NOCASE AND active = 1").get(normalizedCoupon);
      const today = indiaDate();
      if (!coupon || (coupon.starts_at && coupon.starts_at > today) || (coupon.expires_at && coupon.expires_at < today)) {
        throw new Error("INVALID_COUPON");
      }
      if (baseFare < coupon.minimum_amount) {
        throw new Error("COUPON_MINIMUM");
      }
      if (coupon.origin && coupon.origin.toLowerCase() !== trip.origin.toLowerCase()) {
        throw new Error("COUPON_ROUTE");
      }
      discount = coupon.discount_type === "percentage" ? (baseFare * coupon.discount_value) / 100 : coupon.discount_value;
      if (coupon.maximum_discount) {
        discount = Math.min(discount, coupon.maximum_discount);
      }
      discount = Number(Math.min(baseFare, discount).toFixed(2));
    }

    const totalAmount = Number(Math.max(1, subtotal - discount).toFixed(2));
    const code = bookingCode();

    const insertResult = db
      .prepare(
        `INSERT INTO bookings (
          booking_code, user_id, trip_id, seats, total_amount, status,
          passengers_json, selected_seats_json, boarding_point, dropping_point,
          payment_method, payment_status, refund_status, coupon_code, discount_amount,
          passenger_phone, passenger_email, insurance_opted, insurance_amount, gst_amount,
          created_at
        ) VALUES (
          ?, ?, ?, ?, ?, 'confirmed',
          ?, ?, ?, ?,
          ?, 'paid', 'not_applicable', ?, ?,
          ?, ?, ?, ?, ?,
          CURRENT_TIMESTAMP
        )`
      )
      .run(
        code,
        req.user.id,
        trip.id,
        count,
        totalAmount,
        JSON.stringify(passengers),
        JSON.stringify(seatCodes),
        boardingPoint || `${trip.origin} Central Stand`,
        droppingPoint || `${trip.destination} Central Stand`,
        paymentMethod,
        normalizedCoupon || null,
        discount,
        passengerPhone || req.user.phone || null,
        passengerEmail || req.user.email,
        insuranceOpted ? 1 : 0,
        insuranceAmount,
        gstAmount
      );

    // Release seat holds
    db.prepare("DELETE FROM seat_holds WHERE trip_id = ? AND user_id = ?").run(trip.id, req.user.id);

    const created = db
      .prepare(
        `SELECT b.*, t.origin, t.destination, t.travel_date, t.departure_time, t.arrival_time,
                t.operator, t.type, t.bus_type, t.duration, t.rating, t.supports_tracking
         FROM bookings b
         JOIN trips t ON t.id = b.trip_id
         WHERE b.id = ?`
      )
      .get(insertResult.lastInsertRowid);

    createNotification(
      req.user.id,
      "Ticket Confirmed! PNR: " + code,
      `Your trip from ${trip.origin} to ${trip.destination} on ${trip.travel_date} (${trip.departure_time}) with ${trip.operator} is booked. Seats: ${seatCodes.join(", ")}.`,
      "booking",
      code
    );

    return created;
  });

  try {
    const booking = createTx();
    res.status(201).json({
      booking: {
        ...booking,
        passengers: JSON.parse(booking.passengers_json || "[]"),
        selected_seats: JSON.parse(booking.selected_seats_json || "[]")
      }
    });
  } catch (error) {
    const map = {
      TRIP_NOT_FOUND: [404, "Trip not found."],
      SEAT_UNAVAILABLE: [409, "One or more selected seats were booked by someone else. Please choose other seats."],
      INVALID_COUPON: [400, "That coupon code is invalid or has expired."],
      COUPON_MINIMUM: [400, "This coupon requires a higher booking amount."],
      COUPON_ROUTE: [400, "This coupon is not valid for this route."]
    };
    if (map[error.message]) {
      return res.status(map[error.message][0]).json({ error: map[error.message][1] });
    }
    console.error("Booking error:", error);
    res.status(500).json({ error: "Could not complete booking. Please try again." });
  }
});

// ----------------------------------------------------
// User Bookings Management
// ----------------------------------------------------

app.get("/api/bookings/mine", auth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT b.*, t.origin, t.destination, t.travel_date, t.departure_time, t.arrival_time,
              t.operator, t.type, t.bus_type, t.duration, t.rating, t.supports_tracking
       FROM bookings b
       JOIN trips t ON t.id = b.trip_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`
    )
    .all(req.user.id);

  res.json(
    rows.map(r => ({
      ...r,
      passengers: JSON.parse(r.passengers_json || "[]"),
      selected_seats: JSON.parse(r.selected_seats_json || "[]")
    }))
  );
});

app.get("/api/bookings/:code", (req, res) => {
  const row = db
    .prepare(
      `SELECT b.*, t.origin, t.destination, t.travel_date, t.departure_time, t.arrival_time,
              t.operator, t.type, t.bus_type, t.duration, t.rating, t.supports_tracking,
              t.boarding_points_json, t.dropping_points_json, u.name AS booked_by_name
       FROM bookings b
       JOIN trips t ON t.id = b.trip_id
       JOIN users u ON u.id = b.user_id
       WHERE b.booking_code = ?`
    )
    .get(req.params.code);

  if (!row) return res.status(404).json({ error: "Booking ticket not found." });

  res.json({
    ...row,
    passengers: JSON.parse(row.passengers_json || "[]"),
    selected_seats: JSON.parse(row.selected_seats_json || "[]")
  });
});

app.post("/api/bookings/:code/cancel", auth, (req, res) => {
  const booking = db
    .prepare("SELECT b.*, t.travel_date, t.departure_time FROM bookings b JOIN trips t ON t.id = b.trip_id WHERE b.booking_code = ? AND b.user_id = ?")
    .get(req.params.code, req.user.id);

  if (!booking) return res.status(404).json({ error: "Booking not found." });
  if (booking.status === "cancelled") {
    return res.status(409).json({ error: "This booking is already cancelled." });
  }

  // Calculate refund percentage based on Redbus refund policy
  const departureDateTime = new Date(`${booking.travel_date}T${booking.departure_time}:00`);
  const now = new Date();
  const diffHours = (departureDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  let refundPercent = 0;
  if (diffHours >= 24) {
    refundPercent = 90;
  } else if (diffHours >= 12) {
    refundPercent = 70;
  } else if (diffHours >= 6) {
    refundPercent = 50;
  } else {
    refundPercent = 0;
  }

  const refundAmount = Number(((booking.total_amount * refundPercent) / 100).toFixed(2));
  const refundStatus = refundPercent > 0
    ? `Refund of ₹${refundAmount} (${refundPercent}%) processed to TripNest Wallet`
    : "No refund eligible as cancellation was requested under 6 hours from departure";

  db.prepare(
    "UPDATE bookings SET status = 'cancelled', refund_status = ?, cancelled_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(refundStatus, booking.id);

  createNotification(
    req.user.id,
    `Booking ${booking.booking_code} Cancelled`,
    `Your ticket from ${booking.origin || "origin"} has been cancelled. ${refundStatus}.`,
    "cancellation",
    booking.booking_code
  );

  res.json({
    message: "Ticket cancelled successfully.",
    bookingCode: booking.booking_code,
    refundPercent,
    refundAmount,
    refundStatus
  });
});

// Reschedule Booking Date
app.post("/api/bookings/:code/reschedule", auth, (req, res) => {
  const { newDate } = req.body || {};
  if (!validDate(newDate)) {
    return res.status(400).json({ error: "Provide a valid future date (YYYY-MM-DD)." });
  }
  if (newDate < indiaDate()) {
    return res.status(400).json({ error: "New travel date must be today or a future date." });
  }

  const booking = db
    .prepare("SELECT * FROM bookings WHERE booking_code = ? AND user_id = ?")
    .get(req.params.code, req.user.id);

  if (!booking) return res.status(404).json({ error: "Booking not found." });
  if (booking.status === "cancelled") {
    return res.status(400).json({ error: "Cannot reschedule a cancelled ticket." });
  }

  db.prepare("UPDATE bookings SET rescheduled_to = ? WHERE id = ?").run(newDate, booking.id);

  createNotification(
    req.user.id,
    "Journey Rescheduled!",
    `Ticket ${booking.booking_code} has been rescheduled to ${newDate}. Safe travels!`,
    "booking",
    booking.booking_code
  );

  res.json({ message: "Journey rescheduled successfully.", newDate });
});

// ----------------------------------------------------
// Live GPS Bus Tracking Simulator (Redbus Track My Bus)
// ----------------------------------------------------

app.get("/api/tracking/:code", (req, res) => {
  const booking = db
    .prepare(
      `SELECT b.*, t.origin, t.destination, t.travel_date, t.departure_time, t.arrival_time,
              t.operator, t.bus_type, t.boarding_points_json, t.dropping_points_json
       FROM bookings b
       JOIN trips t ON t.id = b.trip_id
       WHERE b.booking_code = ?`
    )
    .get(req.params.code);

  if (!booking) return res.status(404).json({ error: "Trip not found for tracking." });

  // Waypoints simulation based on origin & destination
  const waypoints = [
    { label: `${booking.origin} Boarding Hub`, passed: true, time: booking.departure_time },
    { label: "Expressway Toll Plaza / Highway Entry", passed: true, time: "+45 mins" },
    { label: "Midway Rest Stop & Food Plaza", passed: false, time: "+2 hrs" },
    { label: "City Outer Ring Road Junction", passed: false, time: "-45 mins" },
    { label: `${booking.destination} Drop Point`, passed: false, time: booking.arrival_time }
  ];

  res.json({
    bookingCode: booking.booking_code,
    operator: booking.operator,
    busType: booking.bus_type,
    origin: booking.origin,
    destination: booking.destination,
    travelDate: booking.rescheduled_to || booking.travel_date,
    departureTime: booking.departure_time,
    arrivalTime: booking.arrival_time,
    status: "On Time (Running Smoothly)",
    currentLocation: "Expressway Km 48 · Near Khalapur Food Mall",
    speed: "78 km/h",
    eta: booking.arrival_time,
    driverName: "Rajesh Patil",
    driverPhone: "+91 98234 56789",
    busNumber: "MH 12 QZ 4589",
    batteryLevel: "94%",
    lastUpdated: new Date().toLocaleTimeString(),
    waypoints
  });
});

// ----------------------------------------------------
// Notifications
// ----------------------------------------------------

app.get("/api/notifications", auth, (req, res) => {
  const items = db
    .prepare(
      "SELECT id, title, message, type, booking_code, support_ticket_id, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
    )
    .all(req.user.id);
  const unread = db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL").get(req.user.id).count;
  res.json({ items, unread });
});

app.patch("/api/notifications/read-all", auth, (req, res) => {
  const result = db.prepare("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL").run(req.user.id);
  res.json({ markedRead: result.changes });
});

app.patch("/api/notifications/:id/read", auth, (req, res) => {
  const id = Number(req.params.id);
  db.prepare("UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE id = ? AND user_id = ?").run(id, req.user.id);
  res.json({ success: true });
});

// ----------------------------------------------------
// Help & Support (RedCare Support Center)
// ----------------------------------------------------

const supportCategories = new Set(["booking", "payment", "cancellation", "refund", "bus_issue", "lost_item", "account", "technical"]);
const supportStatuses = new Set(["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"]);

app.get("/api/support/tickets", auth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT t.id, t.ticket_code, t.booking_code, t.category, t.subject, t.status, t.created_at, t.updated_at,
              (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id = t.id) AS message_count
       FROM support_tickets t
       WHERE t.user_id = ?
       ORDER BY t.updated_at DESC LIMIT 100`
    )
    .all(req.user.id);
  res.json(rows);
});

app.post("/api/support/tickets", auth, bookingRateLimit, (req, res) => {
  const { category, subject, description, bookingCode: relatedBooking = null } = req.body || {};
  if (!supportCategories.has(category)) return res.status(400).json({ error: "Choose a valid support category." });
  if (!subject?.trim() || subject.trim().length < 4) return res.status(400).json({ error: "Subject is required (min 4 characters)." });
  if (!description?.trim() || description.trim().length < 10) return res.status(400).json({ error: "Description must be at least 10 characters." });

  const createTx = db.transaction(() => {
    const code = supportCode();
    const inserted = db
      .prepare("INSERT INTO support_tickets (ticket_code, user_id, booking_code, category, subject) VALUES (?, ?, ?, ?, ?)")
      .run(code, req.user.id, relatedBooking || null, category, subject.trim());

    db.prepare("INSERT INTO support_messages (ticket_id, author_user_id, body) VALUES (?, ?, ?)").run(
      inserted.lastInsertRowid,
      req.user.id,
      description.trim()
    );

    createNotification(
      req.user.id,
      `Support Request ${code} Logged`,
      `We received your request regarding '${subject.trim()}'. Our team is on it!`,
      "support",
      relatedBooking,
      inserted.lastInsertRowid
    );

    return db.prepare("SELECT * FROM support_tickets WHERE id = ?").get(inserted.lastInsertRowid);
  });

  const ticket = createTx();
  res.status(201).json({ ticket });
});

app.get("/api/support/tickets/:id", auth, (req, res) => {
  const id = Number(req.params.id);
  const ticket = db
    .prepare("SELECT t.* FROM support_tickets t WHERE t.id = ? AND (t.user_id = ? OR ? = 'admin')")
    .get(id, req.user.id, req.user.role);

  if (!ticket) return res.status(404).json({ error: "Support ticket not found." });

  const messages = db
    .prepare(
      `SELECT m.id, m.body, m.from_staff, m.created_at, u.name AS author
       FROM support_messages m
       JOIN users u ON u.id = m.author_user_id
       WHERE m.ticket_id = ?
       ORDER BY m.created_at ASC, m.id ASC`
    )
    .all(id);

  res.json({ ticket, messages });
});

app.post("/api/support/tickets/:id/messages", auth, bookingRateLimit, (req, res) => {
  const id = Number(req.params.id);
  const body = req.body?.body?.trim();
  if (!body) return res.status(400).json({ error: "Reply body cannot be empty." });

  const ticket = db
    .prepare("SELECT * FROM support_tickets WHERE id = ? AND (user_id = ? OR ? = 'admin')")
    .get(id, req.user.id, req.user.role);

  if (!ticket) return res.status(404).json({ error: "Support ticket not found." });

  const fromStaff = req.user.role === "admin";
  db.prepare("INSERT INTO support_messages (ticket_id, author_user_id, body, from_staff) VALUES (?, ?, ?, ?)").run(
    id,
    req.user.id,
    body,
    fromStaff ? 1 : 0
  );

  const newStatus = fromStaff ? "WAITING_FOR_CUSTOMER" : "IN_PROGRESS";
  db.prepare("UPDATE support_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(newStatus, id);

  if (fromStaff && ticket.user_id !== req.user.id) {
    createNotification(ticket.user_id, "Support Team Replied", `New message on ticket ${ticket.ticket_code}.`, "support", ticket.booking_code, id);
  }

  res.status(201).json({ success: true, message: "Reply posted." });
});

// ----------------------------------------------------
// Admin Management Portal
// ----------------------------------------------------

app.get("/api/admin/overview", auth, admin, (req, res) => {
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(total_amount), 0) AS total FROM bookings WHERE status = 'confirmed'").get().total;
  const totalBookings = db.prepare("SELECT COUNT(*) AS total FROM bookings").get().total;
  const confirmedBookings = db.prepare("SELECT COUNT(*) AS total FROM bookings WHERE status = 'confirmed'").get().total;
  const totalTrips = db.prepare("SELECT COUNT(*) AS total FROM trips").get().total;
  const totalUsers = db.prepare("SELECT COUNT(*) AS total FROM users").get().total;
  const openTickets = db.prepare("SELECT COUNT(*) AS total FROM support_tickets WHERE status IN ('OPEN', 'IN_PROGRESS')").get().total;

  res.json({
    totalRevenue,
    totalBookings,
    confirmedBookings,
    totalTrips,
    totalUsers,
    openTickets
  });
});

app.get("/api/admin/bookings", auth, admin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT b.*, u.name AS customer_name, u.email AS customer_email,
              t.origin, t.destination, t.travel_date, t.departure_time, t.operator
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       JOIN trips t ON t.id = b.trip_id
       ORDER BY b.created_at DESC LIMIT 200`
    )
    .all();
  res.json(rows);
});

app.get("/api/admin/trips", auth, admin, (req, res) => {
  const rows = db.prepare("SELECT * FROM trips ORDER BY travel_date DESC, departure_time ASC LIMIT 300").all();
  res.json(rows);
});

app.post("/api/admin/trips", auth, admin, (req, res) => {
  const t = req.body || {};
  if (!t.origin || !t.destination || !t.travel_date || !t.departure_time || !t.price) {
    return res.status(400).json({ error: "Missing required trip fields." });
  }

  const defaultBoarding = JSON.stringify([
    { name: `${t.origin} Central Bus Station`, time: t.departure_time, landmark: "Platform 1" }
  ]);
  const defaultDropping = JSON.stringify([
    { name: `${t.destination} Central Station`, time: t.arrival_time || "12:00", landmark: "Drop Point" }
  ]);

  const result = db
    .prepare(
      `INSERT INTO trips (
        type, origin, destination, travel_date, departure_time, arrival_time,
        operator, price, duration, total_seats, amenities, bus_type, rating,
        review_count, women_friendly, is_primo, supports_tracking, seat_layout_type,
        boarding_points_json, dropping_points_json, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, CURRENT_TIMESTAMP
      )`
    )
    .run(
      t.type || "bus",
      String(t.origin).trim(),
      String(t.destination).trim(),
      t.travel_date,
      t.departure_time,
      t.arrival_time || "22:00",
      String(t.operator || "TripNest Premium Bus").trim(),
      Number(t.price),
      t.duration || "4h 00m",
      Number(t.total_seats || 36),
      t.amenities || "AC · Wi-Fi · Charging Port",
      t.bus_type || "AC Sleeper (2+1)",
      4.8,
      120,
      1,
      1,
      1,
      t.seat_layout_type || "sleeper_2_1",
      defaultBoarding,
      defaultDropping
    );

  res.status(201).json({ id: result.lastInsertRowid, message: "Bus route created successfully." });
});

app.delete("/api/admin/trips/:id", auth, admin, (req, res) => {
  const id = Number(req.params.id);
  db.prepare("DELETE FROM trips WHERE id = ?").run(id);
  res.json({ success: true, message: "Trip deleted." });
});

app.get("/api/admin/support/tickets", auth, admin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT t.*, u.name AS customer_name, u.email AS customer_email,
              (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id = t.id) AS message_count
       FROM support_tickets t
       JOIN users u ON u.id = t.user_id
       ORDER BY t.updated_at DESC LIMIT 100`
    )
    .all();
  res.json(rows);
});

app.patch("/api/admin/support/tickets/:id", auth, admin, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!supportStatuses.has(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }
  db.prepare("UPDATE support_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, id);
  res.json({ success: true, status });
});

// ----------------------------------------------------
// Fallback & Error Handling
// ----------------------------------------------------

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Endpoint not found." });
  }
  if (req.method !== "GET") {
    return res.status(404).end();
  }
  return res.sendFile(path.join(frontendDist, "index.html"), err => {
    if (err) next(err);
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error("TripNest server error:", error);
  res.status(500).json({ error: "An unexpected server error occurred. Please try again." });
});

app.listen(PORT, () => {
  console.log(`TripNest Pro Server running at http://localhost:${PORT}`);
});
