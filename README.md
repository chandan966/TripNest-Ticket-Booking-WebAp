# TripNest — Full-stack ticket booking web app

A responsive travel-ticket booking MVP inspired by the general booking experience of RedBus, Skyscanner, and ixigo. It is an original demo project and is **not affiliated with those companies**.

## Included features

- Responsive frontend for desktop and mobile
- Search buses, trains, and flights by origin, destination, date, and travel type
- Sort results by fare or departure time and filter by transport type
- Account registration and login with hashed passwords (`bcryptjs`)
- JWT-protected booking and account APIs
- Passenger details, seat availability checks, unique booking codes, and booking history
- Cancel eligible future bookings
- SQLite database with users, trips, and bookings tables
- Demo admin APIs for listing bookings and adding trips
- Seeded sample routes so the app works locally without a third-party travel API

## Requirements

- Node.js 20 or 22 (Node 22 LTS recommended; `better-sqlite3` may need Visual Studio C++ tools on newer Node versions)
- npm

## Run locally

1. Open the `TripNest-Ticket-Booking-WebApp` folder in VS Code.
2. Open a terminal in that folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Copy `.env.example` to `.env`. Change `JWT_SECRET` to a long random value.
5. Start the app:

   ```bash
   npm start
   ```

6. Open **http://localhost:3000**.

The production frontend is built automatically when you run `npm start`. The SQLite database is stored at `backend/data/tripnest.db`, and demo trips are seeded on first startup.

## Main project structure

```text
TripNest-Ticket-Booking-WebApp/
├── frontend/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/   # Reusable UI components; JSX and CSS files stay together
│   │   │   ├── Benefits.jsx / Benefits.css
│   │   │   ├── BookingModals.jsx / BookingModals.css
│   │   │   ├── Footer.jsx / Footer.css
│   │   │   ├── Header.jsx / Header.css
│   │   │   ├── Hero.jsx / Hero.css
│   │   │   ├── JourneySearch.jsx / JourneySearch.css
│   │   │   ├── PopularRoutes.jsx / PopularRoutes.css
│   │   │   ├── TripResults.jsx / TripResults.css
│   │   │   └── GlobalStyles.css
│   │   ├── pages/
│   │   │   └── HomePage.jsx / HomePage.css
│   │   ├── App.jsx       # Root React component
│   │   ├── dom-ui.js     # Search, login, booking and account interactions
│   │   └── main.jsx      # React entry point
│   ├── index.html
│   └── vite.config.js
├── backend/
│   ├── data/             # Local SQLite database
│   ├── scripts/
│   │   └── reset-db.js   # Removes local DB files for a fresh demo
│   ├── src/
│   │   └── db.js         # SQLite schema and demo data
│   └── server.js         # Express REST API
├── package.json
├── .env.example
└── README.md
```

Each UI component keeps its `.jsx` and `.css` files side by side in `frontend/src/components`. Page-level layouts live in `frontend/src/pages`, with their JSX and CSS together.

## Development mode

Run the frontend and backend with automatic restarts:

```bash
npm run dev
```

Open **http://localhost:5173** in development mode. The Vite development server forwards `/api` requests to the backend at port 3000. Use `npm start` for the built app at **http://localhost:3000**.

## API overview

### Health and trip search

- `GET /api/health`
- `GET /api/locations`
- `GET /api/trips?from=Pune&to=Mumbai&date=YYYY-MM-DD&type=bus`
- `GET /api/trips/:id`

Supported `type` values: `bus`, `train`, `flight`.

### Authentication

- `POST /api/auth/register` — JSON: `{ "name": "Demo User", "email": "demo@example.com", "password": "at-least-8-chars" }`
- `POST /api/auth/login` — JSON: `{ "email": "demo@example.com", "password": "..." }`
- `GET /api/auth/me` — requires `Authorization: Bearer <token>`

### Bookings (require a bearer token)

- `POST /api/bookings` — JSON: `{ "tripId": 1, "seats": 1, "passengers": [{ "name": "Demo User", "age": 21 }] }`
- `GET /api/bookings/mine`
- `GET /api/bookings/:code`
- `POST /api/bookings/:code/cancel`

### Admin endpoints

- `GET /api/admin/bookings`
- `POST /api/admin/trips`

Both require a user whose `role` is `admin`. For local development, register a user, stop the app, and set their role in SQLite using a database viewer or SQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

Restart the server and sign in again to obtain a token with the updated role.

## Important project limitations

This is a functional **college/demo MVP**, not a production travel marketplace:

- The sample schedules and prices are fictional demo data. They are not live inventory or guaranteed fares.
- There is no live supplier/GDS/IRCTC/bus-operator integration.
- There is no real payment gateway, ticket issuance, email/SMS delivery, or OTP verification. The UI clearly says that no real payment is collected.
- Before public deployment, add rate limiting, stricter validation, secure cookie/token handling, CSRF strategy if using cookies, request logging, tests, privacy/terms pages, backups, and production secret management.
- SQLite is convenient for local development. For multi-instance deployment, use a managed database such as PostgreSQL and migrate the schema.
- Never publish your `.env` or real credentials.

## Reset demo data

Stop the app, then run:

```bash
npm run db:reset
npm start
```

This deletes the local SQLite database so it is recreated with fresh demo data. It will also delete local demo accounts and bookings.
