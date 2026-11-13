# TripNest — Redbus-Grade Full-Stack Bus Ticket Booking Web App

**TripNest** is a full-stack, Redbus-style online bus ticket booking platform built with **React 19**, **Vite**, **Express 5**, and **SQLite (better-sqlite3 with WAL mode)**.

---

## 🌟 Key Redbus Features

1. **Redbus Crimson Visual Experience**:
   - Signature red brand identity (`#D84E55`), polished cards, smooth micro-interactions, responsive mobile and desktop layout.
   - Quick date selectors (**Today**, **Tomorrow**), city swap (**⇄**), popular city autocomplete.
   - Trending popular Indian bus routes with live fare tags (Pune ⇄ Mumbai, Bangalore ⇄ Goa, Delhi ⇄ Jaipur, Bangalore ⇄ Hyderabad, Chennai ⇄ Bangalore).

2. **Interactive Redbus Seat Layout (Lower & Upper Deck)**:
   - **Lower Deck** & **Upper Deck** switcher for AC Sleeper buses; 2+2 layout for seater buses.
   - Front driver cabin with steering wheel icon.
   - Real-time seat status:
     - ⚪ **Available Seats**
     - 🔴 **Selected Seats** (Vibrant Red)
     - 🔘 **Booked by Male** (Muted grey)
     - 🌸 **Female Reserved Seats** (Soft rose pink with `♀` icon)
   - **5-Minute Server-Side Seat Hold**: Concurrency-safe holding prevents double booking; automatic countdown timer.

3. **Primo Certification & Safety Guarantees**:
   - Redbus **Primo Verified** badge for top-rated operators (★ 4.8+).
   - On-time departure guarantee, clean sanitized AC coaches, verified polite staff.
   - **Women-Friendly** choice filters.

4. **Live GPS Bus Tracking ("Track My Bus")**:
   - Real-time simulated telemetry with cruising speed (e.g. 78 km/h), GPS location along highway milestones, battery level, live ETA, and driver captain contact info.
   - One-click status sharing to clipboard.

5. **Redbus Digital E-Ticket Pass (Print / PDF)**:
   - Authentic digital boarding pass with unique **PNR Number**, **QR Code**, and **Barcode**.
   - Boarding point with landmark, reporting time, and dropping point.
   - Itemized passenger table and fare receipt.
   - 1-click `window.print()` / PDF export.

6. **Offers & Coupons**:
   - Verified active coupon codes:
     - `REDBUS150`: Flat ₹150 off on bookings above ₹600.
     - `FIRSTTRIP`: 15% off up to ₹250 for new users.
     - `TRIPNEST10`: 10% off up to ₹500 on all routes.
     - `SUPERBUS`: Flat ₹120 off on Sleeper & Primo buses.
     - `FESTIVE20`: 20% off up to ₹300.
   - 1-click coupon copy with instant toast alerts.

7. **Cancellation & Rescheduling**:
   - Tiered cancellation refund policy:
     - **> 24 hours**: 90% refund
     - **12 – 24 hours**: 70% refund
     - **6 – 12 hours**: 50% refund
     - **< 6 hours**: Non-refundable
   - Instant date rescheduling to future dates.

8. **RedCare 24/7 Customer Support**:
   - Open support tickets categorized by booking, payment, cancellation, refund, bus issue, lost luggage.
   - Real-time chat messaging between passenger and support officers.

9. **Admin Control Room**:
   - KPI metrics: Total Revenue, Confirmed Bookings, Active Bus Trips, Registered Travellers, Open Tickets.
   - Add new bus routes and operators.
   - View all customer bookings and update support ticket statuses.

10. **Security & SEO**:
    - **Security**: Strict Helmet headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy), rate limiting, bcrypt salt 12 hashing, sanitized input validation.
    - **SEO**: Schema.org JSON-LD structured data (`TravelAgency`, `FAQPage`), Open Graph tags, Twitter Card tags, `robots.txt`, and `sitemap.xml`.

---

## 🚀 Quick Start Guide

### Requirements
- **Node.js** 20.19.0 or higher
- **npm**

### 1. Install & Build
```bash
npm install
npm run build
```

### 2. Start the Application
```bash
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## 👤 Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| **Demo Passenger** | `user@example.com` | `Password123` |
| **Administrator** | `admin@tripnest.com` | `Admin123!` |

*(One-click quick login buttons are also provided in the Sign In modal).*

---

## 🧪 Automated Testing
Run the comprehensive 13-stage end-to-end smoke test suite:
```bash
npm run test:smoke
```

---

## 📡 Key REST API Endpoints

- `GET /api/health` — Service health & uptime
- `GET /api/locations` — All unique cities & destinations
- `GET /api/offers` — Active promo coupons
- `GET /api/trips` — Bus search with multi-filter & sorting
- `GET /api/trips/:id` — Trip details & live seat map
- `POST /api/auth/register` — User signup (bcrypt 12)
- `POST /api/auth/login` — JWT user authentication
- `POST /api/seats/hold` — Concurrency-safe 5-min seat hold
- `POST /api/seats/release` — Release held seats
- `POST /api/bookings` — Create confirmed booking with coupon calculation
- `GET /api/bookings/mine` — View user's tickets
- `GET /api/bookings/:code` — Lookup e-ticket by PNR
- `POST /api/bookings/:code/cancel` — Cancel ticket with refund calculation
- `POST /api/bookings/:code/reschedule` — Change travel date
- `GET /api/tracking/:code` — Real-time GPS bus tracking telemetry
- `GET /api/notifications` — Notification center
- `GET /api/support/tickets` — RedCare customer support
- `GET /api/admin/overview` — Admin KPI metrics
- `POST /api/admin/trips` — Add new bus journey
