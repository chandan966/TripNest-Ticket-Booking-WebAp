const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const dataDir = path.join(__dirname, "..", "data");
const dbPath = process.env.TRIPNEST_DB_PATH || path.join(dataDir, "tripnest.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('bus','train','flight')),
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  travel_date TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  arrival_time TEXT NOT NULL,
  operator TEXT NOT NULL,
  price REAL NOT NULL CHECK(price > 0),
  duration TEXT NOT NULL,
  total_seats INTEGER NOT NULL DEFAULT 36,
  amenities TEXT DEFAULT 'Standard',
  bus_type TEXT NOT NULL DEFAULT 'AC Sleeper (2+1)',
  rating REAL NOT NULL DEFAULT 4.6,
  review_count INTEGER NOT NULL DEFAULT 120,
  women_friendly INTEGER NOT NULL DEFAULT 1,
  is_primo INTEGER NOT NULL DEFAULT 1,
  supports_tracking INTEGER NOT NULL DEFAULT 1,
  seat_layout_type TEXT NOT NULL DEFAULT 'sleeper_2_1',
  boarding_points_json TEXT NOT NULL DEFAULT '[]',
  dropping_points_json TEXT NOT NULL DEFAULT '[]',
  cancellation_policy_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_code TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  trip_id INTEGER NOT NULL REFERENCES trips(id),
  seats INTEGER NOT NULL CHECK(seats > 0),
  total_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled')),
  passengers_json TEXT NOT NULL,
  selected_seats_json TEXT NOT NULL DEFAULT '[]',
  boarding_point TEXT,
  dropping_point TEXT,
  payment_method TEXT NOT NULL DEFAULT 'demo',
  payment_status TEXT NOT NULL DEFAULT 'paid',
  refund_status TEXT NOT NULL DEFAULT 'not_applicable',
  coupon_code TEXT,
  discount_amount REAL NOT NULL DEFAULT 0,
  passenger_phone TEXT,
  passenger_email TEXT,
  insurance_opted INTEGER NOT NULL DEFAULT 0,
  insurance_amount REAL NOT NULL DEFAULT 0,
  gst_amount REAL NOT NULL DEFAULT 0,
  rescheduled_to TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TEXT
);

CREATE TABLE IF NOT EXISTS seat_holds (
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  seat_code TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (trip_id, seat_code)
);

CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY COLLATE NOCASE,
  discount_type TEXT NOT NULL CHECK(discount_type IN ('percentage','fixed')),
  discount_value REAL NOT NULL CHECK(discount_value > 0),
  minimum_amount REAL NOT NULL DEFAULT 0,
  maximum_discount REAL,
  description TEXT,
  starts_at TEXT,
  expires_at TEXT,
  usage_limit INTEGER,
  per_user_limit INTEGER,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  origin TEXT,
  destination TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_code TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_code TEXT REFERENCES bookings(booking_code) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK(category IN ('booking','payment','cancellation','refund','bus_issue','lost_item','account','technical')),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','IN_PROGRESS','WAITING_FOR_CUSTOMER','RESOLVED','CLOSED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_user_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  from_staff INTEGER NOT NULL DEFAULT 0 CHECK(from_staff IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  booking_code TEXT,
  support_ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE SET NULL,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trips_search ON trips(origin,destination,travel_date,type);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id,created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_trip_status ON bookings(trip_id,status);
CREATE INDEX IF NOT EXISTS idx_seat_holds_expiry ON seat_holds(expires_at);
CREATE INDEX IF NOT EXISTS idx_coupons_active_dates ON coupons(active,starts_at,expires_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_date ON support_tickets(user_id,created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_date ON support_tickets(status,created_at);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id,created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_date ON notifications(user_id,read_at,created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_trip ON reviews(trip_id);
`);

// Migration helper to safely add any missing columns in existing SQLite databases
function addMissingColumns(table, definitions) {
  const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name));
  for (const [name, definition] of Object.entries(definitions)) {
    if (!existing.has(name)) {
      try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
      } catch (err) {
        console.warn(`Could not add column ${name} to ${table}:`, err.message);
      }
    }
  }
}

addMissingColumns("users", {
  phone: "TEXT"
});

addMissingColumns("trips", {
  bus_type: "TEXT NOT NULL DEFAULT 'AC Sleeper (2+1)'",
  rating: "REAL NOT NULL DEFAULT 4.6",
  review_count: "INTEGER NOT NULL DEFAULT 120",
  women_friendly: "INTEGER NOT NULL DEFAULT 1",
  is_primo: "INTEGER NOT NULL DEFAULT 1",
  supports_tracking: "INTEGER NOT NULL DEFAULT 1",
  seat_layout_type: "TEXT NOT NULL DEFAULT 'sleeper_2_1'",
  boarding_points_json: "TEXT NOT NULL DEFAULT '[]'",
  dropping_points_json: "TEXT NOT NULL DEFAULT '[]'",
  cancellation_policy_json: "TEXT NOT NULL DEFAULT '[]'"
});

addMissingColumns("bookings", {
  selected_seats_json: "TEXT NOT NULL DEFAULT '[]'",
  boarding_point: "TEXT",
  dropping_point: "TEXT",
  payment_method: "TEXT NOT NULL DEFAULT 'demo'",
  payment_status: "TEXT NOT NULL DEFAULT 'paid'",
  refund_status: "TEXT NOT NULL DEFAULT 'not_applicable'",
  coupon_code: "TEXT",
  discount_amount: "REAL NOT NULL DEFAULT 0",
  passenger_phone: "TEXT",
  passenger_email: "TEXT",
  insurance_opted: "INTEGER NOT NULL DEFAULT 0",
  insurance_amount: "REAL NOT NULL DEFAULT 0",
  gst_amount: "REAL NOT NULL DEFAULT 0",
  rescheduled_to: "TEXT",
  cancelled_at: "TEXT"
});

addMissingColumns("coupons", {
  description: "TEXT"
});

// Clear expired holds
db.prepare("DELETE FROM seat_holds WHERE expires_at <= ?").run(Math.floor(Date.now() / 1000));

// Default demo users
const userCount = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
if (userCount === 0) {
  const insertUser = db.prepare("INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)");
  const userHash = bcrypt.hashSync("Password123", 10);
  const adminHash = bcrypt.hashSync("Admin123!", 10);
  insertUser.run("Demo Traveller", "user@example.com", userHash, "user", "+91 98765 43210");
  insertUser.run("TripNest Admin", "admin@tripnest.com", adminHash, "admin", "+91 98000 00001");
}

// Coupons seed
const couponInsert = db.prepare(`
  INSERT OR REPLACE INTO coupons (code, discount_type, discount_value, minimum_amount, maximum_discount, description, starts_at, expires_at, usage_limit, per_user_limit, active)
  VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 5, 1)
`);

const insertCouponsTx = db.transaction(() => {
  couponInsert.run("REDBUS150", "fixed", 150, 600, 150, "Flat ₹150 off on bus tickets above ₹600");
  couponInsert.run("FIRSTTRIP", "percentage", 15, 300, 250, "15% off up to ₹250 for your first booking");
  couponInsert.run("TRIPNEST10", "percentage", 10, 400, 500, "10% off up to ₹500 on all routes");
  couponInsert.run("SUPERBUS", "fixed", 120, 500, 120, "Save flat ₹120 on AC Sleeper and Primo buses");
  couponInsert.run("FESTIVE20", "percentage", 20, 700, 300, "20% off festive special discount up to ₹300");
});
insertCouponsTx();

// Standard cancellation policy JSON
const defaultCancellationPolicy = JSON.stringify([
  { timeframe: "Before 24 hrs of departure", refundPercent: "90% refund", penalty: "10% fee" },
  { timeframe: "Between 12 to 24 hrs of departure", refundPercent: "70% refund", penalty: "30% fee" },
  { timeframe: "Between 6 to 12 hrs of departure", refundPercent: "50% refund", penalty: "50% fee" },
  { timeframe: "Under 6 hrs of departure", refundPercent: "No refund", penalty: "100% fee" }
]);

// Helper for dynamic dates
function getDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// Seed comprehensive Redbus-style trips across India
const seedTrips = [
  // PUNE <-> MUMBAI
  {
    type: "bus", origin: "Pune", destination: "Mumbai",
    operator: "Shivneri Express (MSRTC)", bus_type: "Volvo 9600 Multi-Axle AC (2+2)",
    rating: 4.8, review_count: 840, women_friendly: 1, is_primo: 1, supports_tracking: 1,
    price: 520, duration: "3h 45m", dep: "06:15", arr: "10:00", total_seats: 40, layout: "seater_2_2",
    amenities: "AC · Water Bottle · USB Charging · Emergency Exit · Live Tracking",
    boarding: [
      { name: "Swargate MSRTC Bus Stand", time: "06:15 AM", landmark: "Platform 3, Swargate" },
      { name: "Pune Station (Near Inox)", time: "06:35 AM", landmark: "Opposite Pune Junction" },
      { name: "Wakad Hinjawadi Flyover", time: "07:05 AM", landmark: "Under Wakad Highway Bridge" },
      { name: "Nigdi Pavana Nagar", time: "07:25 AM", landmark: "Near Nishant Hotel" }
    ],
    dropping: [
      { name: "Vashi Highway Plaza", time: "09:15 AM", landmark: "Near Vashi Toll Naka" },
      { name: "Maitri Park Chembur", time: "09:35 AM", landmark: "Chembur Monorail Station" },
      { name: "Dadar TT Circle (Asiad Stand)", time: "10:00 AM", landmark: "Near Swami Narayan Temple" }
    ]
  },
  {
    type: "bus", origin: "Pune", destination: "Mumbai",
    operator: "Purple Bus - Prasanna", bus_type: "Scania AC Sleeper (2+1)",
    rating: 4.7, review_count: 512, women_friendly: 1, is_primo: 1, supports_tracking: 1,
    price: 650, duration: "3h 30m", dep: "08:30", arr: "12:00", total_seats: 36, layout: "sleeper_2_1",
    amenities: "AC · Blankets · Reading Light · Wi-Fi · Clean Pillows · Live Tracking",
    boarding: [
      { name: "Swargate Purple Office", time: "08:30 AM", landmark: "Near Laxmi Narayan Theater" },
      { name: "Kothrud Paud Road", time: "08:50 AM", landmark: "Near Vanaz Corner" },
      { name: "Bavdhan Chandani Chowk", time: "09:05 AM", landmark: "Beside Highway Flyover" },
      { name: "Wakad Ginger Hotel", time: "09:25 AM", landmark: "Ginger Hotel Bus Stop" }
    ],
    dropping: [
      { name: "Nerul LP Factory", time: "11:15 AM", landmark: "Highway Junction" },
      { name: "Chembur Fine Arts", time: "11:35 AM", landmark: "Near RK Studios" },
      { name: "Borivali East (National Park)", time: "12:00 PM", landmark: "Western Express Highway" }
    ]
  },
  {
    type: "bus", origin: "Pune", destination: "Mumbai",
    operator: "Zingbus Plus", bus_type: "BharatBenz Luxury AC Sleeper",
    rating: 4.9, review_count: 1240, women_friendly: 1, is_primo: 1, supports_tracking: 1,
    price: 599, duration: "3h 40m", dep: "14:15", arr: "17:55", total_seats: 36, layout: "sleeper_2_1",
    amenities: "AC · Free Snacks · Sanitized Berth · Live Tracking · Zero Cancellation Fee",
    boarding: [
      { name: "Viman Nagar Zingbus Lounge", time: "02:15 PM", landmark: "Opposite Inorbit Mall" },
      { name: "Wakad Ginger Hotel", time: "02:45 PM", landmark: "Zingbus Boarding Point" }
    ],
    dropping: [
      { name: "Vashi Plaza", time: "04:50 PM", landmark: "Near Highway Bridge" },
      { name: "Bandra Kalanagar", time: "05:25 PM", landmark: "Kalanagar Junction" },
      { name: "Andheri East (Gundavali Metro)", time: "05:55 PM", landmark: "Under Metro Station" }
    ]
  },
  {
    type: "bus", origin: "Pune", destination: "Mumbai",
    operator: "Neeta Travels", bus_type: "Mercedes Benz Multi-Axle AC Sleeper",
    rating: 4.5, review_count: 980, women_friendly: 1, is_primo: 0, supports_tracking: 1,
    price: 499, duration: "4h 00m", dep: "19:00", arr: "23:00", total_seats: 36, layout: "sleeper_2_1",
    amenities: "AC · Charging Point · Water Bottle · Video Entertainment",
    boarding: [
      { name: "Swargate Neeta Office", time: "07:00 PM", landmark: "Mitramandal Chowk" },
      { name: "Shivajinagar Bus Stand", time: "07:20 PM", landmark: "Near Metro Gate 1" },
      { name: "Wakad Dange Chowk", time: "07:55 PM", landmark: "Near Dange Chowk Signal" }
    ],
    dropping: [
      { name: "Vashi Toll Plaza", time: "10:15 PM", landmark: "Sion Panvel Highway" },
      { name: "Sion Circle", time: "10:45 PM", landmark: "Near Cinemax Theatre" },
      { name: "Borivali West", time: "11:00 PM", landmark: "Gokul Hotel" }
    ]
  },
  {
    type: "bus", origin: "Mumbai", destination: "Pune",
    operator: "Shivneri Express (MSRTC)", bus_type: "Volvo 9600 Multi-Axle AC (2+2)",
    rating: 4.8, review_count: 1100, women_friendly: 1, is_primo: 1, supports_tracking: 1,
    price: 520, duration: "3h 45m", dep: "07:00", arr: "10:45", total_seats: 40, layout: "seater_2_2",
    amenities: "AC · Water Bottle · High Punctuality · CCTV · On-Time Guarantee",
    boarding: [
      { name: "Dadar TT Circle Asiad Stand", time: "07:00 AM", landmark: "Dadar East" },
      { name: "Chembur Maitri Park", time: "07:25 AM", landmark: "Near Highway Signal" },
      { name: "Vashi Highway Stand", time: "07:50 AM", landmark: "Vashi Flyover End" }
    ],
    dropping: [
      { name: "Wakad Highway Bridge", time: "09:40 AM", landmark: "Near Hinjawadi Chowk" },
      { name: "Pune Station MSRTC Stand", time: "10:20 AM", landmark: "Opp Railway Station" },
      { name: "Swargate Bus Terminal", time: "10:45 AM", landmark: "Main Depot" }
    ]
  },
  {
    type: "bus", origin: "Mumbai", destination: "Pune",
    operator: "IntrCity SmartBus", bus_type: "Smart AC Sleeper Lounge (2+1)",
    rating: 4.9, review_count: 1450, women_friendly: 1, is_primo: 1, supports_tracking: 1,
    price: 680, duration: "3h 30m", dep: "18:00", arr: "21:30", total_seats: 36, layout: "sleeper_2_1",
    amenities: "AC · Smart Lounge Access · GPS Bus Track · Onboard Washroom · Free Wi-Fi",
    boarding: [
      { name: "Borivali East IntrCity Lounge", time: "06:00 PM", landmark: "Near National Park" },
      { name: "Andheri Bisleri Compound", time: "06:25 PM", landmark: "Western Express Highway" },
      { name: "Sion Chunabhatti", time: "06:55 PM", landmark: "Eastern Express Highway" },
      { name: "Navi Mumbai Vashi", time: "07:30 PM", landmark: "Plaza Center" }
    ],
    dropping: [
      { name: "Wakad Flyover", time: "09:45 PM", landmark: "Hinjawadi IT Park Junction" },
      { name: "Shivajinagar", time: "10:15 PM", landmark: "COEP Ground" },
      { name: "Swargate", time: "10:30 PM", landmark: "Jedhe Chowk" }
    ]
  },

  // BANGALORE <-> GOA
  {
    type: "bus", origin: "Bangalore", destination: "Goa",
    operator: "VRL Travels", bus_type: "Irizar i6 AC Sleeper (2+1)",
    rating: 4.8, review_count: 2150, women_friendly: 1, is_primo: 1, supports_tracking: 1,
    price: 1350, duration: "11h 30m", dep: "20:30", arr: "08:00", total_seats: 36, layout: "sleeper_2_1",
    amenities: "AC · Blanket · Pillow · Charging Points · Reading Lights · Free Mineral Water",
    boarding: [
      { name: "Majestic Anand Rao Circle", time: "08:30 PM", landmark: "VRL Main Head Office" },
      { name: "Yeshwantpur Govardhan Theatre", time: "09:00 PM", landmark: "Near Metro Pillar 114" },
      { name: "Jalahalli Cross", time: "09:15 PM", landmark: "Opposite Metro Station" }
    ],
    dropping: [
      { name: "Panjim Kadamba Bus Stand", time: "07:30 AM", landmark: "Platform 1, Panjim" },
      { name: "Mapusa Gandhi Circle", time: "08:00 AM", landmark: "Near Taxi Stand" }
    ]
  },
  {
    type: "bus", origin: "Bangalore", destination: "Goa",
    operator: "Orange Tours & Travels", bus_type: "Volvo 9600 AC Sleeper (2+1)",
    rating: 4.7, review_count: 890, women_friendly: 1, is_primo: 1, supports_tracking: 1,
    price: 1450, duration: "12h 00m", dep: "19:45", arr: "07:45", total_seats: 36, layout: "sleeper_2_1",
    amenities: "AC · USB Charging · Emergency Exit · Live Tracking · Clean Linens",
    boarding: [
      { name: "Electronic City Toll", time: "07:45 PM", landmark: "Near Infosys Gate 1" },
      { name: "Madiwala St. Johns Hospital", time: "08:15 PM", landmark: "Near Total Mall" },
      { name: "Majestic Anand Rao Circle", time: "08:50 PM", landmark: "Orange Counter" }
    ],
    dropping: [
      { name: "Madgaon KTC Bus Stand", time: "07:15 AM", landmark: "Near Margao Market" },
      { name: "Panjim Bus Stand", time: "07:45 AM", landmark: "Kadamba Terminal" }
    ]
  },
  {
    type: "bus", origin: "Goa", destination: "Bangalore",
    operator: "SRS Travels", bus_type: "Scania Multi-Axle AC Sleeper",
    rating: 4.6, review_count: 1420, women_friendly: 1, is_primo: 1, supports_tracking: 1,
    price: 1299, duration: "11h 45m", dep: "19:30", arr: "07:15", total_seats: 36, layout: "sleeper_2_1",
    amenities: "AC · Charging Points · Blankets · Water Bottle · Professional Crew",
    boarding: [
      { name: "Mapusa Bus Stand", time: "07:30 PM", landmark: "SRS Counter" },
      { name: "Panjim Kadamba Depot", time: "08:00 PM", landmark: "Near Main Gate" },
      { name: "Margao KTC Stand", time: "08:45 PM", landmark: "Near Margao Flyover" }
    ],
    dropping: [
      { name: "Yeshwantpur Toll Gate", time: "06:30 AM", landmark: "Opposite Metro Station" },
      { name: "Majestic Anand Rao Circle", time: "07:00 AM", landmark: "SRS Head Office" },
      { name: "Electronic City Silk Board", time: "07:15 AM", landmark: "Silk Board Flyover" }
    ]
  },

  // BANGALORE <-> HYDERABAD
  {
    type: "bus", origin: "Bangalore", destination: "Hyderabad",
    operator: "IntrCity SmartBus", bus_type: "Volvo Multi-Axle AC Sleeper (2+1)",
    rating: 4.9, review_count: 2400, women_friendly: 1, is_primo: 1, supports_tracking: 1,
    price: 999, duration: "8h 30m", dep: "22:00", arr: "06:30", total_seats: 36, layout: "sleeper_2_1",
    amenities: "AC · Smart Lounge · Mineral Water · USB Ports · Emergency SOS · Wi-Fi",
    boarding: [
      { name: "Silk Board Junction", time: "10:00 PM", landmark: "IntrCity Lounge" },
      { name: "Indiranagar 100 Feet Road", time: "10:25 PM", landmark: "Near Domlur Flyover" },
      { name: "Hebbal Flyover", time: "10:55 PM", landmark: "Near Esteem Mall" }
    ],
    dropping: [
      { name: "Shamshabad Airport Approach", time: "05:45 AM", landmark: "Near Rajiv Gandhi Airport" },
      { name: "Mehdipatnam Pillar 45", time: "06:15 AM", landmark: "Near Rythu Bazar" },
      { name: "Ameerpet Metro Station", time: "06:30 AM", landmark: "Metro Pillar 1042" }
    ]
  },
  {
    type: "bus", origin: "Bangalore", destination: "Hyderabad",
    operator: "Jabbar Travels", bus_type: "Mercedes AC Semi-Sleeper (2+2)",
    rating: 4.6, review_count: 810, women_friendly: 1, is_primo: 0, supports_tracking: 1,
    price: 799, duration: "8h 45m", dep: "21:30", arr: "06:15", total_seats: 40, layout: "seater_2_2",
    amenities: "AC · Reclining Seats · Charging Ports · Water Bottle",
    boarding: [
      { name: "Kalashipalyam Bus Stand", time: "09:30 PM", landmark: "Jabbar Office" },
      { name: "Majestic Anand Rao Circle", time: "09:50 PM", landmark: "Opp SBI Bank" },
      { name: "Yelahanka Bypass", time: "10:30 PM", landmark: "Near Police Station" }
    ],
    dropping: [
      { name: "Aramghar Junction", time: "05:30 AM", landmark: "National Highway" },
      { name: "Lakdikapul", time: "06:00 AM", landmark: "Near Telephone Bhavan" },
      { name: "Secunderabad Station", time: "06:15 AM", landmark: "Near Gurudwara" }
    ]
  },

  // DELHI <-> JAIPUR
  {
    type: "bus", origin: "Delhi", destination: "Jaipur",
    operator: "Zingbus Plus", bus_type: "Volvo 9600 Multi-Axle AC Sleeper",
    rating: 4.8, review_count: 1780, women_friendly: 1, is_primo: 1, supports_tracking: 1,
    price: 499, duration: "4h 30m", dep: "06:00", arr: "10:30", total_seats: 36, layout: "sleeper_2_1",
    amenities: "AC · High-Speed Wi-Fi · Sanitized Linen · Free Refreshment Kit · GPS",
    boarding: [
      { name: "Kashmere Gate ISBT", time: "06:00 AM", landmark: "Zingbus Premium Lounge Gate 1" },
      { name: "Dhaula Kuan Metro", time: "06:35 AM", landmark: "Under Dhaula Kuan Flyover" },
      { name: "IFFCO Chowk Gurgaon", time: "07:05 AM", landmark: "Near IFFCO Metro Gate 2" }
    ],
    dropping: [
      { name: "Amer Road Bypass", time: "09:45 AM", landmark: "Near Jal Mahal" },
      { name: "Sindhi Camp Bus Terminal", time: "10:15 AM", landmark: "Platform 4, Sindhi Camp" },
      { name: "200 Feet Bypass Ajmer Road", time: "10:30 AM", landmark: "Near Heerapura Flyover" }
    ]
  },
  {
    type: "bus", origin: "Delhi", destination: "Jaipur",
    operator: "RSRTC Goldline Volvo", bus_type: "Scania Multi-Axle AC (2+2)",
    rating: 4.7, review_count: 3200, women_friendly: 1, is_primo: 1, supports_tracking: 1,
    price: 420, duration: "5h 00m", dep: "15:30", arr: "20:30", total_seats: 42, layout: "seater_2_2",
    amenities: "AC · Punctual Departure · Experienced Driver · CCTV · Water Bottle",
    boarding: [
      { name: "Bikaner House (India Gate)", time: "03:30 PM", landmark: "Near Pandara Road" },
      { name: "Dhaula Kuan", time: "04:00 PM", landmark: "Opp Army Hospital" },
      { name: "Gurgaon Rajiv Chowk", time: "04:40 PM", landmark: "Near Tau Devilal Stadium" }
    ],
    dropping: [
      { name: "Narayan Singh Circle", time: "08:00 PM", landmark: "Near City Palace Road" },
      { name: "Sindhi Camp Bus Stand", time: "08:30 PM", landmark: "RSRTC Main Terminal" }
    ]
  },
  {
    type: "bus", origin: "Jaipur", destination: "Delhi",
    operator: "Zingbus Plus", bus_type: "Volvo 9600 AC Sleeper",
    rating: 4.8, review_count: 1650, women_friendly: 1, is_primo: 1, supports_tracking: 1,
    price: 520, duration: "4h 45m", dep: "17:00", arr: "21:45", total_seats: 36, layout: "sleeper_2_1",
    amenities: "AC · Blankets · Power Sockets · Clean Washrooms on Rest Stops",
    boarding: [
      { name: "Sindhi Camp Zingbus Counter", time: "05:00 PM", landmark: "Station Road" },
      { name: "Transport Nagar", time: "05:25 PM", landmark: "Near Entry Gate" }
    ],
    dropping: [
      { name: "Gurgaon IFFCO Chowk", time: "08:50 PM", landmark: "Near MG Road Metro" },
      { name: "Dhaula Kuan", time: "09:15 PM", landmark: "Metro Station Gate 1" },
      { name: "Kashmere Gate ISBT", time: "09:45 PM", landmark: "Metro Gate 5" }
    ]
  },

  // CHENNAI <-> BANGALORE
  {
    type: "bus", origin: "Chennai", destination: "Bangalore",
    operator: "Parveen Travels", bus_type: "Mercedes Multi-Axle AC Sleeper",
    rating: 4.8, review_count: 1320, women_friendly: 1, is_primo: 1, supports_tracking: 1,
    price: 799, duration: "6h 00m", dep: "23:00", arr: "05:00", total_seats: 36, layout: "sleeper_2_1",
    amenities: "AC · Blanket · Pillow · Charging Point · Water Bottle · GPS Tracking",
    boarding: [
      { name: "Koyambedu CMBT", time: "11:00 PM", landmark: "Parveen Lounge CMBT" },
      { name: "Maduravoyal Toll", time: "11:25 PM", landmark: "Near Bypass Flyover" },
      { name: "Sriperumbudur Toll", time: "11:55 PM", landmark: "Hyundai Car Factory" }
    ],
    dropping: [
      { name: "Hosur Bus Stand", time: "04:15 AM", landmark: "Near Flyover" },
      { name: "Electronic City Toll", time: "04:35 AM", landmark: "Infosys Main Gate" },
      { name: "Silk Board Flyover", time: "04:45 AM", landmark: "Near Central Silk Board" },
      { name: "Majestic Anand Rao Circle", time: "05:00 AM", landmark: "Parveen Counter" }
    ]
  },

  // MUMBAI <-> GOA
  {
    type: "bus", origin: "Mumbai", destination: "Goa",
    operator: "Paulo Travels", bus_type: "Volvo 9600 AC Sleeper (2+1)",
    rating: 4.7, review_count: 2200, women_friendly: 1, is_primo: 1, supports_tracking: 1,
    price: 1199, duration: "11h 30m", dep: "19:30", arr: "07:00", total_seats: 36, layout: "sleeper_2_1",
    amenities: "AC · Pillows · Clean Bedspreads · Charging Sockets · Emergency Hammers",
    boarding: [
      { name: "Borivali East (National Park)", time: "07:30 PM", landmark: "Paulo Office" },
      { name: "Andheri East Gundavali", time: "07:55 PM", landmark: "Western Express Highway" },
      { name: "Sion Chunabhatti", time: "08:30 PM", landmark: "Opposite Somaiya College" },
      { name: "Vashi Highway Center", time: "09:00 PM", landmark: "Vashi Plaza Bridge" }
    ],
    dropping: [
      { name: "Mapusa Gandhi Chowk", time: "06:15 AM", landmark: "Paulo Mapusa Hub" },
      { name: "Panjim Kadamba Bus Terminal", time: "06:45 AM", landmark: "Platform 2" },
      { name: "Madgaon KTC", time: "07:00 AM", landmark: "Railway Station Link" }
    ]
  },

  // AHMEDABAD <-> MUMBAI
  {
    type: "bus", origin: "Ahmedabad", destination: "Mumbai",
    operator: "Eagle Falcon Travels", bus_type: "Volvo Multi-Axle AC Sleeper",
    rating: 4.7, review_count: 940, women_friendly: 1, is_primo: 1, supports_tracking: 1,
    price: 899, duration: "8h 30m", dep: "21:30", arr: "06:00", total_seats: 36, layout: "sleeper_2_1",
    amenities: "AC · Wi-Fi · Charging Port · Water Bottle · Video Display",
    boarding: [
      { name: "Paldi Cross Road", time: "09:30 PM", landmark: "Eagle Head Office" },
      { name: "Geeta Mandir Bus Stand", time: "09:50 PM", landmark: "ST Workshop" },
      { name: "CTM Cross Roads", time: "10:15 PM", landmark: "Express Highway Entry" }
    ],
    dropping: [
      { name: "Borivali National Park", time: "05:15 AM", landmark: "Near Omkareshwar Temple" },
      { name: "Andheri West (SV Road)", time: "05:40 AM", landmark: "Near Railway Station" },
      { name: "Dadar Swami Narayan Temple", time: "06:00 AM", landmark: "Asiad Bus Stand" }
    ]
  },

  // PUNE <-> GOA
  {
    type: "bus", origin: "Pune", destination: "Goa",
    operator: "Kadamba Transport Corporation", bus_type: "Scania Multi-Axle AC Sleeper",
    rating: 4.8, review_count: 1480, women_friendly: 1, is_primo: 1, supports_tracking: 1,
    price: 1050, duration: "9h 30m", dep: "21:00", arr: "06:30", total_seats: 36, layout: "sleeper_2_1",
    amenities: "AC · Clean Linen · Sanitized Berths · Professional Drivers",
    boarding: [
      { name: "Swargate Kadamba Counter", time: "09:00 PM", landmark: "Platform 4" },
      { name: "Katraj Wonder City", time: "09:25 PM", landmark: "Near Katraj Tunnel" },
      { name: "Chandani Chowk", time: "09:45 PM", landmark: "Kothrud Flyover" }
    ],
    dropping: [
      { name: "Mapusa Kadamba Stand", time: "05:45 AM", landmark: "Near Taxi Stand" },
      { name: "Panjim Kadamba Terminal", time: "06:15 AM", landmark: "Central Platform" },
      { name: "Margao KTC Station", time: "06:30 AM", landmark: "Margao Hub" }
    ]
  },

  // MULTI-MODAL EXPLORATION
  {
    type: "train", origin: "Mumbai", destination: "Pune",
    operator: "Deccan Queen Superfast", bus_type: "AC Chair Car & Vistadome",
    rating: 4.9, review_count: 5200, women_friendly: 1, is_primo: 1, supports_tracking: 1,
    price: 245, duration: "3h 15m", dep: "07:10", arr: "10:25", total_seats: 72, layout: "seater_2_2",
    amenities: "Pantry Dining Car · Scenic Western Ghats · Charging Points · Bio-Toilets",
    boarding: [{ name: "Mumbai CSMT", time: "07:10 AM", landmark: "Platform 8" }],
    dropping: [{ name: "Pune Junction", time: "10:25 AM", landmark: "Platform 1" }]
  },
  {
    type: "flight", origin: "Mumbai", destination: "Delhi",
    operator: "IndiGo 6E-2041", bus_type: "Airbus A321 Neo",
    rating: 4.8, review_count: 8900, women_friendly: 1, is_primo: 1, supports_tracking: 1,
    price: 3899, duration: "2h 10m", dep: "08:15", arr: "10:25", total_seats: 180, layout: "seater_2_2",
    amenities: "7kg Cabin Baggage · 15kg Check-in · Onboard Meals available",
    boarding: [{ name: "Mumbai Airport Terminal 2 (BOM)", time: "06:15 AM", landmark: "Gate 42" }],
    dropping: [{ name: "Delhi IGI Airport Terminal 1 (DEL)", time: "10:25 AM", landmark: "Arrivals" }]
  }
];

// Always ensure future trips are available for searching
const existingTripCount = db.prepare("SELECT COUNT(*) AS n FROM trips").get().n;
if (existingTripCount < 20) {
  const insertTripStmt = db.prepare(`
    INSERT INTO trips (
      type, origin, destination, travel_date, departure_time, arrival_time,
      operator, price, duration, total_seats, amenities, bus_type, rating,
      review_count, women_friendly, is_primo, supports_tracking, seat_layout_type,
      boarding_points_json, dropping_points_json, cancellation_policy_json
    ) VALUES (
      @type, @origin, @destination, @travel_date, @departure_time, @arrival_time,
      @operator, @price, @duration, @total_seats, @amenities, @bus_type, @rating,
      @review_count, @women_friendly, @is_primo, @supports_tracking, @seat_layout_type,
      @boarding_points_json, @dropping_points_json, @cancellation_policy_json
    )
  `);

  const dayOffsets = [0, 1, 2, 3, 4, 5, 6, 7, 10, 14];

  const seedTx = db.transaction(() => {
    for (const offset of dayOffsets) {
      const dateStr = getDateString(offset);
      for (const item of seedTrips) {
        insertTripStmt.run({
          type: item.type,
          origin: item.origin,
          destination: item.destination,
          travel_date: dateStr,
          departure_time: item.dep,
          arrival_time: item.arr,
          operator: item.operator,
          price: item.price,
          duration: item.duration,
          total_seats: item.total_seats,
          amenities: item.amenities,
          bus_type: item.bus_type,
          rating: item.rating,
          review_count: item.review_count,
          women_friendly: item.women_friendly,
          is_primo: item.is_primo,
          supports_tracking: item.supports_tracking,
          seat_layout_type: item.layout || "sleeper_2_1",
          boarding_points_json: JSON.stringify(item.boarding),
          dropping_points_json: JSON.stringify(item.dropping),
          cancellation_policy_json: defaultCancellationPolicy
        });
      }
    }
  });

  seedTx();
}

module.exports = db;
