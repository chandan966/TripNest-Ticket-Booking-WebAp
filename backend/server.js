const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./src/db");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "development_only_change_this_secret";
const frontendDist = path.join(__dirname, "..", "frontend", "dist");
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(frontendDist));

function createToken(user) {
  return jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Please sign in to continue." });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
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
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && !Number.isNaN(Date.parse(value));
}
function bookingCode() {
  return "TN" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

app.get("/api/health", (req, res) => res.json({ status: "ok", database: "connected", app: "TripNest API" }));

app.post("/api/auth/register", async (req, res) => {
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

app.post("/api/auth/login", async (req, res) => {
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

function tripAvailabilityQuery(whereClause = "", params = []) {
  const sql = `
    SELECT
      t.*,
      CASE
        WHEN t.total_seats - COALESCE(bt.seats_booked, 0) > 0 THEN t.total_seats - COALESCE(bt.seats_booked, 0)
        ELSE 0
      END AS seats_available
    FROM trips t
    LEFT JOIN (
      SELECT trip_id, SUM(seats) AS seats_booked
      FROM bookings
      WHERE status = 'confirmed'
      GROUP BY trip_id
    ) bt ON bt.trip_id = t.id
    ${whereClause}
    ORDER BY t.departure_time ASC, t.price ASC
  `;
  return db.prepare(sql).all(...params);
}

app.get("/api/trips", (req, res) => {
  const { from, to, date, type } = req.query;
  if (date && !validDate(date)) return res.status(400).json({ error: "Date must use YYYY-MM-DD format." });

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

app.post("/api/bookings", auth, (req, res) => {
  const { tripId, seats, passengers } = req.body || {};
  const count = Number(seats);
  if (!Number.isInteger(count) || count < 1 || count > 6) return res.status(400).json({ error: "Choose between 1 and 6 seats." });
  if (!Array.isArray(passengers) || passengers.length !== count || passengers.some(p => !p.name?.trim() || !Number.isInteger(Number(p.age)) || Number(p.age) < 1 || Number(p.age) > 120)) {
    return res.status(400).json({ error: "Enter a name and valid age for every passenger." });
  }
  const create = db.transaction(() => {
    const trip = db.prepare("SELECT * FROM trips WHERE id=?").get(Number(tripId));
    if (!trip) throw new Error("TRIP_NOT_FOUND");
    if (trip.travel_date < new Date().toISOString().slice(0,10)) throw new Error("TRIP_IN_PAST");
    const booked = db.prepare("SELECT COALESCE(SUM(seats),0) AS n FROM bookings WHERE trip_id=? AND status='confirmed'").get(trip.id).n;
    if (trip.total_seats - booked < count) throw new Error("NOT_ENOUGH_SEATS");
    const code = bookingCode();
    const total = Number((trip.price * count).toFixed(2));
    const result = db.prepare("INSERT INTO bookings (booking_code,user_id,trip_id,seats,total_amount,status,passengers_json,created_at) VALUES (?,?,?,?,?,'confirmed',?,CURRENT_TIMESTAMP)")
      .run(code, req.user.id, trip.id, count, total, JSON.stringify(passengers.map(p => ({ name: String(p.name).trim(), age: Number(p.age) }))));
    return db.prepare("SELECT b.*, t.origin,t.destination,t.travel_date,t.departure_time,t.arrival_time,t.operator,t.type FROM bookings b JOIN trips t ON t.id=b.trip_id WHERE b.id=?").get(result.lastInsertRowid);
  });
  try { res.status(201).json({ booking: create() }); }
  catch (error) {
    const map = { TRIP_NOT_FOUND: [404, "Trip not found."], TRIP_IN_PAST: [400, "This trip date has passed."], NOT_ENOUGH_SEATS: [409, "Not enough seats are available. Search again for updated availability."] };
    const item = map[error.message];
    if (item) return res.status(item[0]).json({ error: item[1] });
    console.error(error); res.status(500).json({ error: "Could not complete booking." });
  }
});

app.get("/api/bookings/mine", auth, (req, res) => {
  const rows = db.prepare("SELECT b.*,t.origin,t.destination,t.travel_date,t.departure_time,t.arrival_time,t.operator,t.type,t.duration FROM bookings b JOIN trips t ON t.id=b.trip_id WHERE b.user_id=? ORDER BY b.created_at DESC").all(req.user.id);
  res.json(rows.map(r => ({ ...r, passengers: JSON.parse(r.passengers_json || "[]") })));
});

app.get("/api/bookings/:code", auth, (req, res) => {
  const row = db.prepare("SELECT b.*,t.origin,t.destination,t.travel_date,t.departure_time,t.arrival_time,t.operator,t.type,t.duration FROM bookings b JOIN trips t ON t.id=b.trip_id WHERE b.booking_code=? AND b.user_id=?").get(req.params.code, req.user.id);
  if (!row) return res.status(404).json({ error: "Booking not found." });
  res.json({ ...row, passengers: JSON.parse(row.passengers_json || "[]") });
});

app.post("/api/bookings/:code/cancel", auth, (req, res) => {
  const row = db.prepare("SELECT * FROM bookings WHERE booking_code=? AND user_id=?").get(req.params.code, req.user.id);
  if (!row) return res.status(404).json({ error: "Booking not found." });
  if (row.status === "cancelled") return res.status(409).json({ error: "This booking is already cancelled." });
  const trip = db.prepare("SELECT travel_date FROM trips WHERE id=?").get(row.trip_id);
  if (trip.travel_date <= new Date().toISOString().slice(0,10)) return res.status(400).json({ error: "Bookings for today's or past trips cannot be cancelled online." });
  db.prepare("UPDATE bookings SET status='cancelled',cancelled_at=CURRENT_TIMESTAMP WHERE id=?").run(row.id);
  res.json({ message: "Booking cancelled.", bookingCode: row.booking_code });
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

app.get("*", (req, res) => res.sendFile(path.join(frontendDist, "index.html")));
app.listen(PORT, () => console.log(`TripNest is running at http://localhost:${PORT}`));
