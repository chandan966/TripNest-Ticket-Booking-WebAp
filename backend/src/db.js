const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const dataDir = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "tripnest.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
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
  total_seats INTEGER NOT NULL DEFAULT 40,
  amenities TEXT DEFAULT 'Standard',
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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_trips_search ON trips(origin,destination,travel_date,type);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id,created_at);
`);

const count = db.prepare("SELECT COUNT(*) AS n FROM trips").get().n;
if (count === 0) {
  const insert = db.prepare(`INSERT INTO trips (type,origin,destination,travel_date,departure_time,arrival_time,operator,price,duration,total_seats,amenities)
    VALUES (@type,@origin,@destination,@travel_date,@departure_time,@arrival_time,@operator,@price,@duration,@total_seats,@amenities)`);
  const today = new Date();
  const dateAt = offset => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0,10);
  };
  const sample = [
    ["bus","Pune","Mumbai",1,"06:15","10:00","Neeta Travels",499,"3h 45m",40,"AC Sleeper · Charging"],
    ["bus","Pune","Mumbai",1,"08:30","12:15","Purple Bus",649,"3h 45m",36,"AC Seater · Wi-Fi"],
    ["bus","Mumbai","Pune",1,"17:00","21:00","Shivneri Express",550,"4h","40","AC Seater"],
    ["train","Mumbai","Pune",2,"07:10","10:45","Deccan Queen",235,"3h 35m",72,"Chair Car · Pantry"],
    ["train","Pune","Hyderabad",3,"21:30","08:15","Hussain Sagar Express",680,"10h 45m",80,"Sleeper · Pantry"],
    ["flight","Mumbai","Delhi",2,"09:20","11:35","IndiGo",4299,"2h 15m",180,"Cabin bag · In-flight service"],
    ["flight","Pune","Bengaluru",4,"14:10","15:45","Akasa Air",3499,"1h 35m",150,"Cabin bag · Snacks available"],
    ["bus","Mumbai","Goa",5,"20:00","07:30","IntrCity SmartBus",1199,"11h 30m",36,"AC Sleeper · Live tracking"],
    ["train","Pune","Nagpur",4,"18:25","07:40","Maharashtra Express",420,"13h 15m",72,"Sleeper · Pantry"],
    ["bus","Pune","Nashik",2,"09:00","13:00","MSRTC Shivai",390,"4h","40","AC Seater"],
    ["flight","Delhi","Mumbai",3,"18:45","21:00","Air India Express",5199,"2h 15m",180,"Cabin bag · Refreshments"],
    ["train","Mumbai","Goa",6,"23:10","10:30","Konkan Kanya Express",760,"11h 20m",72,"Sleeper · Pantry"]
  ];
  const tx = db.transaction(() => sample.forEach(s => insert.run({
    type:s[0],origin:s[1],destination:s[2],travel_date:dateAt(s[3]),departure_time:s[4],arrival_time:s[5],operator:s[6],price:Number(s[7]),duration:s[8],total_seats:Number(s[9]) || 40,amenities:s[10]
  })));
  tx();
}
module.exports = db;
