const http = require("http");

async function request(url, options = {}) {
  const parsed = new URL(url);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 3000,
        path: parsed.pathname + parsed.search,
        method: options.method || "GET",
        headers: options.headers || {}
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runSmokeTests() {
  console.log("==========================================");
  console.log("STARTING TRIPNEST E2E FULL-STACK TESTS");
  console.log("==========================================");

  const base = "http://localhost:3000";

  // 1. Health
  console.log("\n1. Testing Health API...");
  const health = await request(`${base}/api/health`);
  console.log("Health Status:", health.status, health.data);
  if (health.status !== 200) throw new Error("Health check failed");

  // 2. Locations
  console.log("\n2. Testing Locations API...");
  const locations = await request(`${base}/api/locations`);
  console.log("Total Locations:", locations.data?.length, locations.data?.slice(0, 5));
  if (!locations.data?.includes("Pune") || !locations.data?.includes("Mumbai")) {
    throw new Error("Locations check failed");
  }

  // 3. Offers
  console.log("\n3. Testing Offers API...");
  const offers = await request(`${base}/api/offers`);
  console.log("Active Offers Count:", offers.data?.length, offers.data?.map(o => o.code));
  if (!offers.data?.some(o => o.code === "REDBUS150")) {
    throw new Error("REDBUS150 coupon missing");
  }

  // 4. Search Trips
  console.log("\n4. Testing Trips Search API...");
  const trips = await request(`${base}/api/trips?from=Pune&to=Mumbai`);
  console.log("Found Pune-Mumbai Trips:", trips.data?.length);
  if (!trips.data || trips.data.length === 0) throw new Error("No trips found");
  const testTrip = trips.data[0];
  console.log("Sample Bus:", testTrip.operator, testTrip.bus_type, `₹${testTrip.price}`);

  // 5. Auth Login
  console.log("\n5. Testing Auth Login...");
  const loginRes = await request(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "user@example.com", password: "Password123" })
  });
  console.log("Login Status:", loginRes.status, "User:", loginRes.data?.user?.name);
  if (loginRes.status !== 200 || !loginRes.data?.token) throw new Error("Login failed");
  const userToken = loginRes.data.token;

  // 6. Hold Seats
  console.log("\n6. Testing Seat Hold API (5 min timer)...");
  const holdRes = await request(`${base}/api/seats/hold`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`
    },
    body: JSON.stringify({ tripId: testTrip.id, seatCodes: ["L1", "L2"] })
  });
  console.log("Seat Hold Result:", holdRes.status, holdRes.data);
  if (holdRes.status !== 200 || !holdRes.data.seats) throw new Error("Seat hold failed");

  // 7. Complete Booking with Coupon REDBUS150
  console.log("\n7. Testing Booking Checkout with Coupon REDBUS150...");
  const bookRes = await request(`${base}/api/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`
    },
    body: JSON.stringify({
      tripId: testTrip.id,
      seats: 2,
      passengers: [
        { name: "Chandan Ghanghav", age: 26, gender: "Male", seat: "L1" },
        { name: "Pooja Sharma", age: 25, gender: "Female", seat: "L2" }
      ],
      seatCodes: ["L1", "L2"],
      boardingPoint: testTrip.boarding_points[0]?.name,
      droppingPoint: testTrip.dropping_points[0]?.name,
      paymentMethod: "upi_demo",
      couponCode: "REDBUS150",
      passengerPhone: "9876543210",
      passengerEmail: "chandan@example.com",
      insuranceOpted: true
    })
  });
  console.log("Booking Status:", bookRes.status);
  const booking = bookRes.data?.booking;
  if (!booking || !booking.booking_code) {
    console.error("Booking error details:", bookRes.data);
    throw new Error("Booking creation failed");
  }
  console.log("PNR Generated:", booking.booking_code, "Total Fare: ₹" + booking.total_amount);

  // 8. Public Ticket Lookup
  console.log("\n8. Testing E-Ticket Retrieval by PNR...");
  const ticketRes = await request(`${base}/api/bookings/${booking.booking_code}`);
  console.log("Ticket Lookup Status:", ticketRes.status, "Passenger count:", ticketRes.data?.passengers?.length);
  if (ticketRes.status !== 200) throw new Error("Ticket lookup failed");

  // 9. Live GPS Bus Tracking
  console.log("\n9. Testing Live GPS Bus Tracking Simulator...");
  const trackingRes = await request(`${base}/api/tracking/${booking.booking_code}`);
  console.log("Tracking Status:", trackingRes.data?.status, "Location:", trackingRes.data?.currentLocation, "Speed:", trackingRes.data?.speed);
  if (trackingRes.status !== 200 || !trackingRes.data?.currentLocation) {
    throw new Error("Tracking API failed");
  }

  // 10. Reschedule Journey
  console.log("\n10. Testing Reschedule Travel Date API...");
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 4);
  const futureDateStr = futureDate.toISOString().slice(0, 10);
  const rescheduleRes = await request(`${base}/api/bookings/${booking.booking_code}/reschedule`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`
    },
    body: JSON.stringify({ newDate: futureDateStr })
  });
  console.log("Reschedule Status:", rescheduleRes.status, rescheduleRes.data);
  if (rescheduleRes.status !== 200) throw new Error("Reschedule failed");

  // 11. Ticket Cancellation & Refund Policy
  console.log("\n11. Testing Ticket Cancellation & Refund Calculation...");
  const cancelRes = await request(`${base}/api/bookings/${booking.booking_code}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`
    }
  });
  console.log("Cancellation Status:", cancelRes.status, "Refund:", cancelRes.data?.refundStatus);
  if (cancelRes.status !== 200) throw new Error("Cancellation failed");

  // 12. Support Center
  console.log("\n12. Testing RedCare Support Ticket Center...");
  const supportRes = await request(`${base}/api/support/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`
    },
    body: JSON.stringify({
      category: "booking",
      subject: "Seat change assistance request",
      description: "Need help confirming window berth preference on my upcoming journey.",
      bookingCode: booking.booking_code
    })
  });
  console.log("Support Ticket Logged:", supportRes.data?.ticket?.ticket_code);
  if (supportRes.status !== 201) throw new Error("Support ticket creation failed");

  // 13. Admin Login & Overview
  console.log("\n13. Testing Admin Controls...");
  const adminLogin = await request(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@tripnest.com", password: "Admin123!" })
  });
  const adminToken = adminLogin.data?.token;
  const adminOverview = await request(`${base}/api/admin/overview`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log("Admin Overview KPIs:", adminOverview.data);
  if (adminOverview.status !== 200) throw new Error("Admin overview failed");

  console.log("\n==========================================");
  console.log("ALL 13 E2E TESTS PASSED WITH 100% SUCCESS!");
  console.log("==========================================");
}

runSmokeTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
