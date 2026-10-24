const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "data", "tripnest.db");
for (const suffix of ["", "-shm", "-wal"]) {
  try { fs.unlinkSync(file + suffix); } catch {}
}
console.log("Database files removed. Start the app again to create a fresh demo database.");
