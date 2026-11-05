# TripNest

TripNest is a college/demo travel-booking application for comparing and booking sample bus, train, and flight journeys. It is an original project and is not affiliated with any transport operator or booking company.

## Stack

- Next.js App Router with serverless API routes
- React
- Neon PostgreSQL
- JWT authentication and bcrypt password hashing
- Vercel deployment

## Run locally

Requirements: Node.js 20.9 or newer and npm.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Neon project and copy its connection string into `.env.local`:

   ```env
   DATABASE_URL=postgresql://...
   JWT_SECRET=use-a-long-random-secret
   ```

   `.env.example` lists optional credentials for future Razorpay, maps, and Cloudinary integrations. Do not commit environment files or put secrets in `NEXT_PUBLIC_*` variables.

3. Create the tables and sample trips:

   ```bash
   npm run db:seed
   ```

4. Start Next.js:

   ```bash
   npm run dev
   ```

5. Open **http://localhost:3000**.

The database setup command is safe to rerun: it creates missing tables and only inserts the sample journeys when the trips table is empty.

## Deploy to Vercel

1. Import the repository into Vercel.
2. Add `DATABASE_URL` and `JWT_SECRET` to the project's Environment Variables for the environments you will use.
3. Deploy. Vercel detects the Next.js app and builds its API routes as serverless functions.
4. Run `npm run db:seed` once with the production Neon connection string before demonstrating the deployed app.

Never commit `.env.local` or share database/payment secrets.

## Included demo flows

- Responsive TripNest booking interface
- Search buses, trains, and flights by route, date, and type
- Sort and filter journeys by fare, departure window, and bus type; explore sample operator ratings, women-friendly badges, and Primo-style listings
- Select seats, boarding/drop points, passengers, and a payment option in the demo booking flow
- Apply sample offer codes, view a printable sample e-ticket, and see an approximate demo tracker for bus bookings
- Create an account and sign in
- Reserve available seats with passenger details
- View booking history, request a demo reschedule, and cancel eligible future bookings
- Admin APIs for listing bookings and adding sample trips

The sample schedules, fares, and availability are fictional. Payment is not collected, and bookings are not tickets issued by a transport provider.

## API routes

- `GET /api/health`
- `GET /api/locations`
- `GET /api/trips?from=Pune&to=Mumbai&date=YYYY-MM-DD&type=bus`
- `GET /api/trips/:id`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/bookings`
- `GET /api/bookings/mine`
- `GET /api/bookings/:code`
- `POST /api/bookings/:code/cancel`
- `GET /api/admin/bookings`
- `POST /api/admin/trips`

Authenticated API calls use `Authorization: Bearer <token>`. To enable the demo admin APIs, promote a registered account in Neon:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

Sign out and back in to receive a token with the updated role.

## Demo limitations

This project is not a production travel marketplace. Schedules, availability, ratings, safety badges, seat maps, offers, and tracking are sample data. Payments offer test/demo choices only and do not call Razorpay; refunds are not processed. Live operator inventory, real ticket issuance, GPS tracking, SMS/OTP, hotel inventory, and customer-support integrations require external providers. Maps and Cloudinary are optional future integrations; credentials alone are not wired up by the current demo.

Before any real-world use, add provider integrations, secure session/cookie handling, rate limits, monitoring, privacy/terms pages, robust cancellation/refund policies, and production security review.
