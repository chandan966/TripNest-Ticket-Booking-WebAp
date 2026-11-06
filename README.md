# TripNest

TripNest is an original bus-booking demo for comparing sample journeys and exercising a complete local booking flow. Sample trips and operators are fictional; the project is not affiliated with a transport provider.

## Local stack

- React and Vite frontend
- Express API
- SQLite database at `backend/data/tripnest.db`
- bcrypt password hashing and JWT authentication

The repository also contains an older Next.js and Neon API path. The local `npm run dev` flow described here uses Express and SQLite.

## Run locally

Requirements: Node.js 20.19 or newer and npm.

1. Install dependencies with `npm install`.
2. Ensure `.env` contains a random `JWT_SECRET` with at least 32 characters. Keep `.env` private. `DATABASE_URL` is only needed by the optional Neon/Next path.
3. Start the app with `npm run dev` and open **http://localhost:3000**.

The `predev` step builds the Vite frontend before Express serves it. `npm run build` builds the frontend only. The SQLite database creates its tables and sample routes on first start and preserves existing local records on later starts.

To run the separate Next.js path, use `npm run dev:next`. Its API uses Neon PostgreSQL and requires `DATABASE_URL`; it does not use the SQLite seat-hold endpoints.

## Working local flows

- Search sample bus, train, and flight routes by city, date, and type.
- Register, sign in, and view account bookings.
- Hold up to six specific seats on the server for five minutes. Expired holds are rejected at checkout, and one customer cannot hold a seat already held or booked by another customer.
- Save passenger and boarding/drop details with a demo booking.
- Apply active database coupons with minimum fare, date, route, and usage validation.
- View/print a clearly marked sample ticket, cancel eligible future bookings, and release the seats.
- View account notifications for bookings, cancellations, and support updates; mark one or all as read.
- Create support tickets, attach an owned booking reference, exchange replies, and track status. Admin accounts can reply and update ticket status.
- Use limited admin booking/trip APIs after promoting an account in the local SQLite database.

The payment selector is for demonstration only. It does not contact Razorpay or collect money; demo bookings are clearly labeled and are not valid travel tickets.

## API routes

- `GET /api/health`, `/api/locations`, `/api/offers`
- `GET /api/trips`, `/api/trips/:id`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/seats/hold`, `POST /api/seats/release`
- `POST /api/bookings`, `GET /api/bookings/mine`, `GET /api/bookings/:code`
- `POST /api/bookings/:code/cancel`
- `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`
- `GET /api/support/tickets`, `POST /api/support/tickets`, `GET /api/support/tickets/:id`, `POST /api/support/tickets/:id/messages`
- `GET /api/admin/bookings`, `POST /api/admin/trips`
- `GET /api/admin/support/tickets`, `PATCH /api/admin/support/tickets/:id`

Authenticated API calls use `Authorization: Bearer <token>`. For local admin access, set a registered account's role in SQLite, then sign out and back in:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Production integrations still required

The working local flow uses demo inventory and demo payment status. Real bookings require a payment provider order and server-side signature verification, live operator inventory, refund handling, customer communications, and valid operator ticket issuance. Those services are not configured in this repository, so the app must not be presented as selling real tickets.

The Next.js/Neon path is separate and currently lacks the Express seat-hold behavior. Choose and complete one deployment architecture before production use. Do not use SQLite on ephemeral serverless storage.

Never commit `.env`, `.env.local`, or real payment, database, email, or SMS credentials.
