# TrackMate — Real-Time College Bus Tracking System

TrackMate is a full-stack Progressive Web Application (PWA) that enables real-time GPS tracking of college buses. It provides three role-based dashboards — **Admin**, **Driver**, and **Student** — connected through WebSocket communication for live position updates, ETA calculations, and push notifications.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 7, Tailwind CSS, Leaflet Maps, Socket.IO Client |
| Backend | Node.js, Express 4, Socket.IO 4, Mongoose 7 |
| Database | MongoDB Atlas |
| Auth | JWT (JSON Web Tokens), bcryptjs |
| Notifications | Web Push (VAPID), Nodemailer (Gmail) |
| Geospatial | @turf/turf, OSRM Routing Service |

## Features

- **Real-time GPS tracking** with live map updates via WebSocket
- **Automatic ETA calculation** using OSRM routing + exponential smoothing
- **Geofence-based stop detection** — auto-detects bus arrival/departure at stops
- **Push notifications** — proximity alerts, arrival notifications, SOS emergency alerts
- **Email registration system** — welcome email with credentials on student signup
- **Role-based access control** — Admin, Driver, Student with protected routes
- **PWA support** — installable, works offline, service worker caching
- **Admin dashboard** — fleet management, analytics, trip history, CSV export
- **Driver dashboard** — trip management, live location sharing, manual stop events
- **Student dashboard** — live ETA, bus position, event history, notification preferences
- **Rate limiting** on auth endpoints for brute-force protection
- **NoSQL injection prevention** via input sanitization middleware
- **Password security** — bcrypt hashing, first-login forced password change

## Project Structure

```
TrackMate/
├── backend/                    # Express API server
│   ├── server.js               # Entry point, middleware, route mounting
│   ├── config/                 # DB connection, constants
│   ├── controllers/            # Route handlers & Socket.IO logic
│   ├── middleware/              # Auth, role, validation middleware
│   ├── models/                 # Mongoose schemas (7 models)
│   ├── routes/                 # Express route definitions
│   ├── utils/                  # Email, ETA, geo, notifications, logging
│   ├── inMemory/               # In-memory active trip state cache
│   └── scripts/                # Database seed script
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── pages/              # 13 page components
│   │   ├── components/         # 14 reusable components
│   │   ├── context/            # Auth & Theme context providers
│   │   ├── hooks/              # Custom hooks (auth, geolocation, socket)
│   │   ├── constants/          # API URLs, geo constants
│   │   └── utils/              # API client, ETA utils, notifications
│   └── public/                 # PWA manifest, service worker, markers
└── lp-files/                   # Landing page assets
```

## Prerequisites

- **Node.js** v18 or higher
- **MongoDB** (local or Atlas cloud)
- **Gmail account** with App Password for email service
- **VAPID keys** for push notifications

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Maganti-Praveen/TrackMate.git
cd TrackMate
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
NODE_ENV=development

MONGO_URI=your_mongodb_connection_string
DB_NAME=TrackMatev1

JWT_SECRET=your_jwt_secret_key

ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

OSRM_BASE_URL=http://router.project-osrm.org

EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password

VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:your_email@example.com

STALE_TRIP_HOURS=12
```

Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

### 3. Seed the Admin Account

```bash
npm run seed
```

This creates a default admin account: `ad1` / `ad1` (change password on first login).

### 4. Start the Backend

```bash
npm run dev     # Development (with nodemon auto-restart)
# or
npm start       # Production
```

### 5. Frontend Setup

```bash
cd ../frontend
npm install
```

Edit the `.env` file in the `frontend/` directory:

```env
# Backend API URL
# For local dev: comment this out → auto-detects localhost / LAN
# For production (Vercel): set to your Render backend URL
VITE_BACKEND_URL=https://trackmate-backend.onrender.com

VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
VITE_MIN_UPDATE_INTERVAL_MS=1000
```

> **Tip:** For local development, comment out `VITE_BACKEND_URL` — the app auto-detects `localhost` and LAN IPs.

### 6. Start the Frontend

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Mobile Testing (LAN)

To test on mobile devices connected to the same WiFi:

1. The frontend auto-detects LAN access and connects to the backend using the LAN IP
2. Open Windows Firewall for ports 5000 and 5173
3. On mobile Chrome, add your LAN URLs to `chrome://flags/#unsafely-treat-insecure-origin-as-secure` for PWA features (push notifications, service worker, geolocation)

## Default Accounts

| Role | Username | Password | Notes |
|------|----------|----------|-------|
| Admin | ad1 | ad1 | Created by seed script |

Students self-register via the app. Drivers are created by the admin through the dashboard.

## Scripts

| Command | Directory | Description |
|---------|-----------|-------------|
| `npm run dev` | backend | Start with nodemon (auto-restart) |
| `npm start` | backend | Production start |
| `npm run seed` | backend | Seed admin account |
| `npm run dev` | frontend | Vite dev server with HMR |
| `npm run build` | frontend | Production build |
| `npm run preview` | frontend | Preview production build |

## Deployment

### Backend → Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repo, set root directory to `backend`
3. Build command: `npm install` | Start command: `npm start`
4. Add all backend environment variables (`MONGO_URI`, `JWT_SECRET`, `VAPID_*`, `EMAIL_*`, etc.)
5. Set `ALLOWED_ORIGINS` to your Vercel frontend URL (e.g., `https://trackmate.vercel.app`)

### Frontend → Vercel

1. Import your GitHub repo on [Vercel](https://vercel.com)
2. Set root directory to `frontend`
3. Add environment variable: `VITE_BACKEND_URL` = your Render backend URL (e.g., `https://trackmate-backend.onrender.com`)
4. Add `VITE_VAPID_PUBLIC_KEY` with your VAPID public key
5. Deploy — `vercel.json` handles SPA routing automatically

> **No code changes needed** — just set `VITE_BACKEND_URL` in Vercel's environment variables to point to your Render backend.

## License

This project is developed by Maganti Praveen Sai as a final year project.
