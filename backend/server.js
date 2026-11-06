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
const JWT_SECRET = process.env.JWT_SECRET || "";
const frontendDist = path.join(__dirname, "..", "frontend", "dist");
const allowedOrigins = new Set((process.env.CORS_ORIGIN || "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173").split(",").map(value => value.trim()).filter(Boolean));
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.has(origin)) return callback(null, true);
  return callback(new Error("Origin is not allowed by CORS."));
} }));
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
app.use(express.static(frontendDist));

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
      return res.status(429).json({ error: "Too many requests. Please wait and try again." });
    }
    if (rateLimitBuckets.size > 5000) {
      for (const [address, entry] of rateLimitBuckets) if (entry.resetAt <= now) rateLimitBuckets.delete(address);
    }
    next();
  };
}
const authRateLimit = rateLimit({ limit: 20, windowMs: 15 * 60 * 1000 });
const bookingRateLimit = rateLimit({ limit: 30, windowMs: 60 * 1000 });

function getJwtSecret() {
  if (JWT_SECRET.length < 32 || /replace_this_with|change_this_secret/i.test(JWT_SECRET)) {
    throw new Error("JWT_SECRET must be configured with at least 32 non-placeholder characters.");
  }
  return JWT_SECRET;
}
function createToken(user) {
  return jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, getJwtSecret(), { expiresIn: "7d" });
}
function auth(req, res, next) {
  try { getJwtSecret(); } catch { return res.status(503).json({ error: "Authentication is not configured. Set a strong JWT_SECRET in .env." }); }
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
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  next();
}
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function indiaDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function validSeatCodes(value, totalSeats) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6 || new Set(value).size !== value.length) return false;
  return value.every(seat => {
    if (typeof seat !== "string" || !/^[A-Z]\d{1,2}$/.test(seat)) return false;
    const rowNumber = seat.charCodeAt(0) - 65;
    const seatNumber = Number(seat.slice(1));
    return seatNumber >= 1 && seatNumber <= 4 && rowNumber * 4 + seatNumber <= totalSeats;
  });
}
function bookingCode() {
  return "TN" + Date.now().toString(36).toUpperCase() + randomBytes(4).toString("hex").toUpperCase();
}
function supportCode() {
  return "SUP-" + randomBytes(5).toString("hex").toUpperCase();
}
function createNotification(userId, title, message, type, bookingCodeValue = null, ticketId = null) {
  db.prepare("INSERT INTO notifications (user_id,title,message,type,booking_code,support_ticket_id) VALUES (?,?,?,?,?,?)")
    .run(userId, title, message, type, bookingCodeValue, ticketId);
}

app.get("/api/health", (req, res) => res.json({ status: "ok", database: "connected", app: "TripNest API" }));

app.post("/api/auth/register", authRateLimit, async (req, res) => {
  try { getJwtSecret(); } catch { return res.status(503).json({ error: "Authentication is not configured. Set a strong JWT_SECRET in .env." }); }
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ error: "Name, email, and password are required." });
  if (String(password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return res.status(400).json({ error: "Enter a valid email address." });
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare("INSERT INTO users (name,email,password_hash,role,created_at) VALUES (?,?,?,'user',CURRENT_TIMESTAMP)").run(name.trim(), normalizedEmail, hash);
    const user = db.prepare("SELECT id,name,email,role FROM users WHERE id=?").get(result.lastInsertRowid);
    res.status(201).json({ token: createToken(user), user });
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) return res.status(409).json({ error: "An account with this email already exists." });
    console.error(error); res.status(500).json({ error: "Could not create account." });
  }
});

app.post("/api/auth/login", authRateLimit, async (req, res) => {
  try { getJwtSecret(); } catch { return res.status(503).json({ error: "Authentication is not configured. Set a strong JWT_SECRET in .env." }); }
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
  const userRow = db.prepare("SELECT * FROM users WHERE email=?").get(String(email).trim().toLowerCase());
  if (!userRow || !(await bcrypt.compare(password, userRow.password_hash))) return res.status(401).json({ error: "Incorrect email or password." });
  const user = { id: userRow.id, name: userRow.name, email: userRow.email, role: userRow.role };
  res.json({ token: createToken(user), user });
});

app.get("/api/auth/me", auth, (req, res) => {
  const user = db.prepare("SELECT id,name,email,role,created_at FROM users WHERE id=?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "Account not found." });
  res.json({ user });
});

app.get("/api/locations", (req, res) => {
  const rows = db.prepare("SELECT DISTINCT origin AS city FROM trips UNION SELECT DISTINCT destination AS city FROM trips ORDER BY city").all();
  res.json(rows.map(r => r.city));
});

app.get("/api/offers", (req, res) => {
  const today = indiaDate();
  const offers = db.prepare(`SELECT code,discount_type,discount_value,minimum_amount,maximum_discount,expires_at
    FROM coupons WHERE active=1 AND (starts_at IS NULL OR starts_at<=?) AND (expires_at IS NULL OR expires_at>=?)
    ORDER BY discount_value DESC, code ASC`).all(today, today);
  res.json(offers.map(offer => ({
    ...offer,
    discount_label: offer.discount_type === "percentage" ? `${offer.discount_value}% off` : `₹${offer.discount_value} off`,
  })));
});

function tripAvailabilityQuery(whereClause = "", params = []) {
  const sql = `
    SELECT
      t.*,
      CASE
        WHEN t.total_seats - COALESCE(bt.seats_booked, 0) - COALESCE(ht.seats_held, 0) > 0 THEN t.total_seats - COALESCE(bt.seats_booked, 0) - COALESCE(ht.seats_held, 0)
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
    ORDER BY t.departure_time ASC, t.price ASC
  `;
  return db.prepare(sql).all(...params).map(row => {
    let bookedSeats = [];
    let heldSeats = [];
    try { bookedSeats = JSON.parse(row.booked_seats_json || "[]"); } catch {}
    try { heldSeats = JSON.parse(row.held_seats_json || "[]"); } catch {}
    const { booked_seats_json, held_seats_json, ...trip } = row;
    const parsePoints = (json, fallback) => {
      try { const points = JSON.parse(json || "[]"); return points.length ? points : [fallback]; } catch { return [fallback]; }
    };
    return {
      ...trip,
      boarding_points: parsePoints(trip.boarding_points_json, `${trip.origin} Central`),
      dropping_points: parsePoints(trip.dropping_points_json, `${trip.destination} Central`),
      booked_seats: bookedSeats,
      held_seats: heldSeats,
    };
  });
}

app.get("/api/trips", (req, res) => {
  const { from, to, date, type } = req.query;
  if (date && !validDate(date)) return res.status(400).json({ error: "Date must use YYYY-MM-DD format." });
  if (date && date < indiaDate()) return res.status(400).json({ error: "Choose today or a future travel date." });
  if (type && !["bus", "train", "flight"].includes(String(type))) return res.status(400).json({ error: "Choose a supported journey type." });

  const whereClauses = [];
  const params = [];
  if (from) { whereClauses.push("lower(origin)=lower(?)"); params.push(String(from)); }
  if (to) { whereClauses.push("lower(destination)=lower(?)"); params.push(String(to)); }
  if (date) { whereClauses.push("travel_date=?"); params.push(String(date)); }
  if (type && ["bus","train","flight"].includes(String(type))) { whereClauses.push("type=?"); params.push(String(type)); }

  const trips = tripAvailabilityQuery(whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "", params);
  res.json(trips);
});

app.get("/api/trips/:id", (req, res) => {
  const trip = tripAvailabilityQuery("WHERE t.id = ?", [Number(req.params.id)])[0];
  if (!trip) return res.status(404).json({ error: "Trip not found." });
  res.json(trip);
});

app.post("/api/seats/hold", auth, bookingRateLimit, (req, res) => {
  const tripId = Number(req.body?.tripId);
  const seatCodes = req.body?.seatCodes;
  if (!Number.isInteger(tripId) || tripId < 1) return res.status(400).json({ error: "Choose a valid trip." });
  const holdSeats = db.transaction(() => {
    const now = Math.floor(Date.now() / 1000);
    db.prepare("DELETE FROM seat_holds WHERE expires_at <= ?").run(now);
    const trip = db.prepare("SELECT id,travel_date,total_seats FROM trips WHERE id=?").get(tripId);
    if (!trip) throw new Error("TRIP_NOT_FOUND");
    if (trip.travel_date < indiaDate()) throw new Error("TRIP_IN_PAST");
    if (!validSeatCodes(seatCodes, trip.total_seats)) throw new Error("INVALID_SEATS");
    const booked = new Set(db.prepare("SELECT selected_seats_json FROM bookings WHERE trip_id=? AND status='confirmed'").all(tripId).flatMap(row => {
      try { return JSON.parse(row.selected_seats_json || "[]"); } catch { return []; }
    }));
    if (seatCodes.some(seat => booked.has(seat))) throw new Error("SEAT_UNAVAILABLE");
    db.prepare("DELETE FROM seat_holds WHERE trip_id=? AND user_id=?").run(tripId, req.user.id);
    const insert = db.prepare("INSERT INTO seat_holds (trip_id,seat_code,user_id,expires_at) VALUES (?,?,?,?)");
    const expiresAt = now + 5 * 60;
    for (const seat of seatCodes) insert.run(tripId, seat, req.user.id, expiresAt);
    return { expiresAt: expiresAt * 1000, seats: seatCodes };
  });
  try { res.json(holdSeats.immediate()); }
  catch (error) {
    const map = {
      TRIP_NOT_FOUND: [404, "Trip not found."],
      TRIP_IN_PAST: [400, "This trip date has passed."],
      INVALID_SEATS: [400, "Choose valid seats for this trip."],
      SEAT_UNAVAILABLE: [409, "One or more selected seats are already booked."],
    };
    if (String(error.code || "").startsWith("SQLITE_CONSTRAINT_UNIQUE") || error.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
      return res.status(409).json({ error: "One or more seats are being held by another traveller. Choose different seats." });
    }
    if (map[error.message]) return res.status(map[error.message][0]).json({ error: map[error.message][1] });
    console.error(error); res.status(500).json({ error: "Could not reserve those seats." });
  }
});

app.post("/api/seats/release", auth, bookingRateLimit, (req, res) => {
  const tripId = Number(req.body?.tripId);
  const seatCodes = req.body?.seatCodes;
  if (!Number.isInteger(tripId) || tripId < 1 || !Array.isArray(seatCodes)) return res.status(400).json({ error: "Choose a valid trip and seat list." });
  if (seatCodes.some(seat => typeof seat !== "string" || !/^[A-Z]\d{1,2}$/.test(seat))) return res.status(400).json({ error: "Seat list is invalid." });
  const released = seatCodes.length
    ? db.prepare(`DELETE FROM seat_holds WHERE trip_id=? AND user_id=? AND seat_code IN (${seatCodes.map(() => "?").join(",")})`).run(tripId, req.user.id, ...seatCodes).changes
    : db.prepare("DELETE FROM seat_holds WHERE trip_id=? AND user_id=?").run(tripId, req.user.id).changes;
  res.json({ released });
});

app.post("/api/bookings", auth, bookingRateLimit, (req, res) => {
  const { tripId, seats, passengers, seatCodes, boardingPoint = null, droppingPoint = null, paymentMethod = "demo", couponCode = "" } = req.body || {};
  const count = Number(seats);
  if (!Number.isInteger(count) || count < 1 || count > 6) return res.status(400).json({ error: "Choose between 1 and 6 seats." });
  if (!Number.isInteger(Number(tripId)) || Number(tripId) < 1) return res.status(400).json({ error: "Choose a valid trip." });
  if (!Array.isArray(passengers) || passengers.length !== count || passengers.some(p => !p.name?.trim() || !Number.isInteger(Number(p.age)) || Number(p.age) < 1 || Number(p.age) > 120)) {
    return res.status(400).json({ error: "Enter a name and valid age for every passenger." });
  }
  if (!validSeatCodes(seatCodes, 1000) || seatCodes.length !== count) return res.status(400).json({ error: "Select one unique valid seat for every passenger." });
  if (!["demo", "upi_test", "card_test", "netbanking_test", "wallet_demo"].includes(paymentMethod)) return res.status(400).json({ error: "Choose an available demo payment option." });
  if (typeof couponCode !== "string" || couponCode.length > 24) return res.status(400).json({ error: "Coupon code is invalid." });
  const create = db.transaction(() => {
    const trip = db.prepare("SELECT * FROM trips WHERE id=?").get(Number(tripId));
    if (!trip) throw new Error("TRIP_NOT_FOUND");
    if (trip.travel_date < indiaDate()) throw new Error("TRIP_IN_PAST");
    if (!validSeatCodes(seatCodes, trip.total_seats)) throw new Error("INVALID_SEATS");
    const parsePoints = (json, fallback) => {
      try { const points = JSON.parse(json || "[]"); return points.length ? points : [fallback]; } catch { return [fallback]; }
    };
    const boardingPoints = parsePoints(trip.boarding_points_json, `${trip.origin} Central`);
    const droppingPoints = parsePoints(trip.dropping_points_json, `${trip.destination} Central`);
    if (boardingPoint && !boardingPoints.includes(boardingPoint)) throw new Error("INVALID_BOARDING_POINT");
    if (droppingPoint && !droppingPoints.includes(droppingPoint)) throw new Error("INVALID_DROPPING_POINT");
    const now = Math.floor(Date.now() / 1000);
    const ownedHolds = new Set(db.prepare("SELECT seat_code FROM seat_holds WHERE trip_id=? AND user_id=? AND expires_at>? ").all(trip.id, req.user.id, now).map(row => row.seat_code));
    if (!seatCodes.every(seat => ownedHolds.has(seat))) throw new Error("HOLD_EXPIRED");
    const bookedSeats = new Set(db.prepare("SELECT selected_seats_json FROM bookings WHERE trip_id=? AND status='confirmed'").all(trip.id).flatMap(row => {
      try { return JSON.parse(row.selected_seats_json || "[]"); } catch { return []; }
    }));
    if (seatCodes.some(seat => bookedSeats.has(seat))) throw new Error("SEAT_UNAVAILABLE");
    const booked = db.prepare("SELECT COALESCE(SUM(seats),0) AS n FROM bookings WHERE trip_id=? AND status='confirmed'").get(trip.id).n;
    const held = db.prepare("SELECT COUNT(*) AS n FROM seat_holds WHERE trip_id=? AND expires_at>? ").get(trip.id, now).n;
    if (trip.total_seats - booked - held < 0) throw new Error("NOT_ENOUGH_SEATS");
    const subtotal = Number((trip.price * count).toFixed(2));
    const normalizedCoupon = couponCode.trim().toUpperCase();
    let discount = 0;
    if (normalizedCoupon) {
      const coupon = db.prepare("SELECT * FROM coupons WHERE code=? COLLATE NOCASE AND active=1").get(normalizedCoupon);
      const today = indiaDate();
      if (!coupon || (coupon.starts_at && coupon.starts_at > today) || (coupon.expires_at && coupon.expires_at < today)) throw new Error("INVALID_COUPON");
      if (subtotal < coupon.minimum_amount) throw new Error("COUPON_MINIMUM");
      if ((coupon.origin && coupon.origin.toLowerCase() !== trip.origin.toLowerCase()) || (coupon.destination && coupon.destination.toLowerCase() !== trip.destination.toLowerCase())) throw new Error("COUPON_ROUTE");
      const globalUses = db.prepare("SELECT COUNT(*) AS n FROM bookings WHERE coupon_code=? AND status='confirmed'").get(normalizedCoupon).n;
      const userUses = db.prepare("SELECT COUNT(*) AS n FROM bookings WHERE coupon_code=? AND user_id=? AND status='confirmed'").get(normalizedCoupon, req.user.id).n;
      if (coupon.usage_limit !== null && globalUses >= coupon.usage_limit) throw new Error("COUPON_LIMIT");
      if (coupon.per_user_limit !== null && userUses >= coupon.per_user_limit) throw new Error("COUPON_USER_LIMIT");
      discount = coupon.discount_type === "percentage" ? subtotal * coupon.discount_value / 100 : coupon.discount_value;
      if (coupon.maximum_discount !== null) discount = Math.min(discount, coupon.maximum_discount);
      discount = Number(Math.min(subtotal, discount).toFixed(2));
    }
    const code = bookingCode();
    const total = Number((subtotal - discount).toFixed(2));
    const result = db.prepare("INSERT INTO bookings (booking_code,user_id,trip_id,seats,total_amount,status,passengers_json,selected_seats_json,boarding_point,dropping_point,payment_method,payment_status,coupon_code,discount_amount,created_at) VALUES (?,?,?,?,?,'confirmed',?,?,?,?,?,'demo_only',?,?,CURRENT_TIMESTAMP)")
      .run(code, req.user.id, trip.id, count, total, JSON.stringify(passengers.map(p => ({ name: String(p.name).trim(), age: Number(p.age) }))), JSON.stringify(seatCodes), boardingPoint || boardingPoints[0], droppingPoint || droppingPoints[0], paymentMethod, normalizedCoupon || null, discount);
    db.prepare("DELETE FROM seat_holds WHERE trip_id=? AND user_id=?").run(trip.id, req.user.id);
    const created = db.prepare("SELECT b.*, t.origin,t.destination,t.travel_date,t.departure_time,t.arrival_time,t.operator,t.type FROM bookings b JOIN trips t ON t.id=b.trip_id WHERE b.id=?").get(result.lastInsertRowid);
    createNotification(req.user.id, "Demo booking confirmed", `${trip.origin} to ${trip.destination} is saved. This is a demo booking; no payment was collected.`, "booking", code);
    return created;
  }).immediate;
  try { res.status(201).json({ booking: create() }); }
  catch (error) {
    const map = { TRIP_NOT_FOUND: [404, "Trip not found."], TRIP_IN_PAST: [400, "This trip date has passed."], INVALID_SEATS: [400, "Choose valid seats for this trip."], INVALID_BOARDING_POINT: [400, "Choose a listed boarding point."], INVALID_DROPPING_POINT: [400, "Choose a listed dropping point."], HOLD_EXPIRED: [409, "Your seat hold expired. Select your seats again."], SEAT_UNAVAILABLE: [409, "A selected seat is no longer available."], NOT_ENOUGH_SEATS: [409, "Not enough seats are available. Search again for updated availability."], INVALID_COUPON: [400, "That offer code is invalid, inactive, or expired."], COUPON_MINIMUM: [400, "This offer requires a higher booking amount."], COUPON_ROUTE: [400, "This offer is not valid for this route."], COUPON_LIMIT: [400, "This offer has reached its usage limit."], COUPON_USER_LIMIT: [400, "You have already used this offer the maximum number of times."] };
    const item = map[error.message];
    if (item) return res.status(item[0]).json({ error: item[1] });
    console.error(error); res.status(500).json({ error: "Could not complete booking." });
  }
});

app.get("/api/bookings/mine", auth, (req, res) => {
  const rows = db.prepare("SELECT b.*,t.origin,t.destination,t.travel_date,t.departure_time,t.arrival_time,t.operator,t.type,t.duration FROM bookings b JOIN trips t ON t.id=b.trip_id WHERE b.user_id=? ORDER BY b.created_at DESC").all(req.user.id);
  res.json(rows.map(r => ({ ...r, passengers: JSON.parse(r.passengers_json || "[]"), selected_seats: JSON.parse(r.selected_seats_json || "[]") })));
});

app.get("/api/bookings/:code", auth, (req, res) => {
  const row = db.prepare("SELECT b.*,t.origin,t.destination,t.travel_date,t.departure_time,t.arrival_time,t.operator,t.type,t.duration FROM bookings b JOIN trips t ON t.id=b.trip_id WHERE b.booking_code=? AND b.user_id=?").get(req.params.code, req.user.id);
  if (!row) return res.status(404).json({ error: "Booking not found." });
  res.json({ ...row, passengers: JSON.parse(row.passengers_json || "[]"), selected_seats: JSON.parse(row.selected_seats_json || "[]") });
});

app.post("/api/bookings/:code/cancel", auth, (req, res) => {
  const row = db.prepare("SELECT * FROM bookings WHERE booking_code=? AND user_id=?").get(req.params.code, req.user.id);
  if (!row) return res.status(404).json({ error: "Booking not found." });
  if (row.status === "cancelled") return res.status(409).json({ error: "This booking is already cancelled." });
  const trip = db.prepare("SELECT travel_date FROM trips WHERE id=?").get(row.trip_id);
  if (trip.travel_date <= indiaDate()) return res.status(400).json({ error: "Bookings for today's or past trips cannot be cancelled online." });
  db.prepare("UPDATE bookings SET status='cancelled',cancelled_at=CURRENT_TIMESTAMP WHERE id=?").run(row.id);
  createNotification(req.user.id, "Booking cancelled", `${row.booking_code} was cancelled. No refund was due because demo bookings do not collect payment.`, "cancellation", row.booking_code);
  res.json({ message: "Booking cancelled.", bookingCode: row.booking_code });
});

app.get("/api/notifications", auth, (req, res) => {
  const items = db.prepare("SELECT id,title,message,type,booking_code,support_ticket_id,read_at,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 100").all(req.user.id);
  const unread = db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id=? AND read_at IS NULL").get(req.user.id).count;
  res.json({ items, unread });
});

app.patch("/api/notifications/read-all", auth, (req, res) => {
  const result = db.prepare("UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE user_id=? AND read_at IS NULL").run(req.user.id);
  res.json({ markedRead: result.changes });
});

app.patch("/api/notifications/:id/read", auth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: "Notification not found." });
  db.prepare("UPDATE notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE id=? AND user_id=?").run(id, req.user.id);
  const row = db.prepare("SELECT id,read_at FROM notifications WHERE id=? AND user_id=?").get(id, req.user.id);
  if (!row) return res.status(404).json({ error: "Notification not found." });
  res.json({ id: row.id, read: Boolean(row.read_at) });
});

const supportCategories = new Set(["booking", "payment", "cancellation", "refund", "bus_issue", "lost_item", "account", "technical"]);
const supportStatuses = new Set(["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"]);

app.get("/api/support/tickets", auth, (req, res) => {
  const rows = db.prepare(`SELECT t.id,t.ticket_code,t.booking_code,t.category,t.subject,t.status,t.created_at,t.updated_at,
    (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id=t.id) AS message_count
    FROM support_tickets t WHERE t.user_id=? ORDER BY t.updated_at DESC,t.id DESC LIMIT 100`).all(req.user.id);
  res.json(rows);
});

app.post("/api/support/tickets", auth, bookingRateLimit, (req, res) => {
  const { category, subject, description, bookingCode: relatedBooking = null } = req.body || {};
  if (!supportCategories.has(category)) return res.status(400).json({ error: "Choose a valid support category." });
  if (typeof subject !== "string" || subject.trim().length < 4 || subject.trim().length > 120) return res.status(400).json({ error: "Subject must be between 4 and 120 characters." });
  if (typeof description !== "string" || description.trim().length < 10 || description.trim().length > 4000) return res.status(400).json({ error: "Description must be between 10 and 4,000 characters." });
  if (relatedBooking !== null && (typeof relatedBooking !== "string" || relatedBooking.length > 32)) return res.status(400).json({ error: "Booking reference is invalid." });
  if (relatedBooking && !db.prepare("SELECT id FROM bookings WHERE booking_code=? AND user_id=?").get(relatedBooking, req.user.id)) return res.status(404).json({ error: "Booking not found." });
  const create = db.transaction(() => {
    const ticketCode = supportCode();
    const inserted = db.prepare("INSERT INTO support_tickets (ticket_code,user_id,booking_code,category,subject) VALUES (?,?,?,?,?)")
      .run(ticketCode, req.user.id, relatedBooking, category, subject.trim());
    db.prepare("INSERT INTO support_messages (ticket_id,author_user_id,body) VALUES (?,?,?)").run(inserted.lastInsertRowid, req.user.id, description.trim());
    createNotification(req.user.id, "Support request received", `We received ${ticketCode} and will follow up here.`, "support", relatedBooking, inserted.lastInsertRowid);
    return db.prepare("SELECT id,ticket_code,booking_code,category,subject,status,created_at,updated_at FROM support_tickets WHERE id=?").get(inserted.lastInsertRowid);
  });
  res.status(201).json({ ticket: create() });
});

app.get("/api/support/tickets/:id", auth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: "Support ticket not found." });
  const ticket = db.prepare("SELECT t.* FROM support_tickets t WHERE t.id=? AND (t.user_id=? OR ?='admin')").get(id, req.user.id, req.user.role);
  if (!ticket) return res.status(404).json({ error: "Support ticket not found." });
  const messages = db.prepare(`SELECT m.id,m.body,m.from_staff,m.created_at,u.name AS author
    FROM support_messages m JOIN users u ON u.id=m.author_user_id WHERE m.ticket_id=? ORDER BY m.created_at,m.id`).all(id);
  res.json({ ticket, messages });
});

app.post("/api/support/tickets/:id/messages", auth, bookingRateLimit, (req, res) => {
  const id = Number(req.params.id);
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: "Support ticket not found." });
  if (body.length < 1 || body.length > 4000) return res.status(400).json({ error: "Message must be between 1 and 4,000 characters." });
  const ticket = db.prepare("SELECT * FROM support_tickets WHERE id=? AND (user_id=? OR ?='admin')").get(id, req.user.id, req.user.role);
  if (!ticket) return res.status(404).json({ error: "Support ticket not found." });
  if (["RESOLVED", "CLOSED"].includes(ticket.status)) return res.status(409).json({ error: "This support ticket is closed." });
  const fromStaff = req.user.role === "admin";
  const addMessage = db.transaction(() => {
    db.prepare("INSERT INTO support_messages (ticket_id,author_user_id,body,from_staff) VALUES (?,?,?,?)").run(id, req.user.id, body, fromStaff ? 1 : 0);
    const status = fromStaff ? "WAITING_FOR_CUSTOMER" : (ticket.status === "WAITING_FOR_CUSTOMER" ? "IN_PROGRESS" : ticket.status);
    db.prepare("UPDATE support_tickets SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(status, id);
    if (fromStaff && ticket.user_id !== req.user.id) createNotification(ticket.user_id, "Support replied", `There is a new reply on ${ticket.ticket_code}.`, "support", ticket.booking_code, id);
  });
  addMessage();
  res.status(201).json({ message: "Reply added." });
});

app.get("/api/admin/support/tickets", auth, admin, (req, res) => {
  const status = req.query.status;
  if (status && !supportStatuses.has(String(status))) return res.status(400).json({ error: "Choose a valid ticket status." });
  const rows = status
    ? db.prepare(`SELECT t.*,u.name AS customer,(SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id=t.id) AS message_count
        FROM support_tickets t JOIN users u ON u.id=t.user_id WHERE t.status=? ORDER BY t.updated_at DESC LIMIT 500`).all(String(status))
    : db.prepare(`SELECT t.*,u.name AS customer,(SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id=t.id) AS message_count
        FROM support_tickets t JOIN users u ON u.id=t.user_id ORDER BY t.updated_at DESC LIMIT 500`).all();
  res.json(rows);
});

app.patch("/api/admin/support/tickets/:id", auth, admin, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!Number.isInteger(id) || id < 1 || !supportStatuses.has(status)) return res.status(400).json({ error: "Choose a valid support ticket status." });
  const ticket = db.prepare("SELECT * FROM support_tickets WHERE id=?").get(id);
  if (!ticket) return res.status(404).json({ error: "Support ticket not found." });
  db.prepare("UPDATE support_tickets SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(status, id);
  createNotification(ticket.user_id, "Support request updated", `${ticket.ticket_code} is now ${status.toLowerCase().replaceAll("_", " ")}.`, "support", ticket.booking_code, id);
  res.json({ ticketCode: ticket.ticket_code, status });
});

/* Small admin API for demo/college project management. Promote a user by editing role in SQLite. */
app.get("/api/admin/bookings", auth, admin, (req, res) => {
  res.json(db.prepare("SELECT b.booking_code,b.seats,b.total_amount,b.status,b.created_at,u.name AS customer,u.email,t.origin,t.destination,t.travel_date,t.operator FROM bookings b JOIN users u ON u.id=b.user_id JOIN trips t ON t.id=b.trip_id ORDER BY b.created_at DESC LIMIT 500").all());
});
app.post("/api/admin/trips", auth, admin, (req, res) => {
  const t = req.body || {};
  const required = ["type","origin","destination","travel_date","departure_time","arrival_time","operator","price","duration","total_seats"];
  if (required.some(k => t[k] === undefined || t[k] === "") || !["bus","train","flight"].includes(t.type) || !validDate(t.travel_date) || Number(t.price) <= 0 || Number(t.total_seats) < 1) {
    return res.status(400).json({ error: "Provide valid trip details." });
  }
  const result = db.prepare("INSERT INTO trips (type,origin,destination,travel_date,departure_time,arrival_time,operator,price,duration,total_seats,amenities,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)")
    .run(t.type, String(t.origin).trim(), String(t.destination).trim(), t.travel_date, t.departure_time, t.arrival_time, String(t.operator).trim(), Number(t.price), String(t.duration), Number(t.total_seats), String(t.amenities || "Standard"));
  res.status(201).json({ id: result.lastInsertRowid, message: "Trip created." });
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return res.status(404).json({ error: "Endpoint not found." });
  if (req.method !== "GET") return res.status(404).end();
  return res.sendFile(path.join(frontendDist, "index.html"), error => { if (error) next(error); });
});
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.message === "Origin is not allowed by CORS.") return res.status(403).json({ error: "This origin is not allowed to access the API." });
  console.error("TripNest request failed:", error.message);
  return res.status(500).json({ error: "The request could not be completed. Please try again." });
});
app.listen(PORT, () => console.log(`TripNest is running at http://localhost:${PORT}`));
