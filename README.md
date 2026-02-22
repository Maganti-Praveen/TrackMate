# 🚍 TrackMate — Real-Time School Bus Tracking System

**TrackMate** is a full-stack, real-time school bus tracking platform built for **Ramachandra College of Engineering (RCE), Eluru**. It enables students to track their assigned bus live on a map, receive push-notification ETAs, and get redirected to alternative buses if they miss theirs — all from a mobile-friendly Progressive Web App.

---

## ✨ Key Features

### 🔐 Role-Based Access (Admin / Driver / Student)

| Role | Capabilities |
|---|---|
| **Admin** | Manage buses, drivers, routes, stops, students. View live map of all buses, trip analytics, CSV export. Assign students to buses/stops. Bulk-upload students via CSV. |
| **Driver** | Start/end trips, share GPS in real time via WebSocket, trigger SOS alerts, view route with stops. Built-in driver simulator for testing. |
| **Student** | View assigned bus on a live map, see real-time ETA to their stop, receive push notifications on bus proximity, report missed bus and get redirected to nearest alternative. |

### 🗺️ Real-Time GPS Tracking

- **WebSocket-powered** location streaming (Socket.IO) — sub-second latency
- **OSRM-based ETA** — road-aware driving-time estimates, with exponential smoothing for stability
- **Automatic stop detection** — geo-fence triggers (75 m radius, 3 s dwell) auto-detect arrivals/departures
- **Segment statistics** — historical travel times per segment improve ETA accuracy over time

### 🔔 Push Notifications (Web Push / VAPID)

- Proximity alerts when the bus is N minutes / N meters from the student's stop
- Arrival/left notifications per stop
- SOS emergency broadcasts from the driver
- Email fallback via **Brevo HTTP API** (welcome email, stop arrival, password reset)

### 🚫 Missed Bus Redirect

- Student taps "Missed Bus" → system finds the nearest alternative bus (same route first, then cross-route) that hasn't passed their stop yet
- Live tracking automatically switches to the redirect bus
- Cancel redirect any time to return to original assignment

### 🌐 Public Tracking

- Shareable URL `/track/BusNo30` — no login required
- Bus selector page at `/track` lists all buses with live status
- Space-insensitive, case-insensitive URL matching

### 📱 Progressive Web App (PWA)

- Installable on Android/iOS home screen
- Offline fallback page
- Service worker with cache-first strategy for static assets, network-first for navigation
- Wake Lock API to prevent screen dimming during tracking

---

## 🏗️ Architecture

```
┌──────────────────────┐         ┌──────────────────────┐
│   React Frontend     │◄──────►│   Express Backend     │
│   (Vite + React 18)  │  REST  │   (Node.js)           │
│                      │◄──────►│                       │
│   Leaflet Maps       │  WS    │   Socket.IO Server    │
│   Framer Motion      │        │   MongoDB Atlas       │
│   Bootstrap 5        │        │   OSRM Routing        │
│   Lucide Icons       │        │   Brevo Email API     │
│   PWA + Service Worker│       │   Web Push (VAPID)    │
└──────────────────────┘         └──────────────────────┘
```

### Backend Stack

| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| Socket.IO | Real-time bidirectional GPS streaming |
| MongoDB Atlas (Mongoose) | Persistent storage |
| OSRM | Road-network ETA calculations |
| web-push (VAPID) | Browser push notifications |
| Brevo HTTP API | Transactional emails |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT authentication |
| express-rate-limit | Rate limiting for auth endpoints |
| @turf/turf | Geospatial calculations (point-on-line, line-slice) |
| csv-parser + multer | CSV bulk upload |

### Frontend Stack

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Vite 7 | Build tool + dev server |
| React Router 6 | Client-side routing |
| Leaflet + React-Leaflet | Interactive maps |
| Socket.IO Client | Real-time updates |
| Framer Motion | Animations |
| Bootstrap 5 | Base styling |
| Lucide React | Icon system |
| PapaParse | CSV parsing in browser |
| @dnd-kit | Drag-and-drop stop reordering |
| Axios | HTTP client |

---

## 📂 Project Structure

```
TrackMate/
├── backend/
│   ├── server.js                 # Express + Socket.IO entry point
│   ├── config/
│   │   ├── db.js                 # MongoDB connection
│   │   └── constants.js          # App-wide constants & env validation
│   ├── models/
│   │   ├── User.js               # User (admin/driver/student)
│   │   ├── Bus.js                # Bus entity
│   │   ├── Route.js              # Route with embedded stops + segStats
│   │   ├── Stop.js               # Physical stop (linked to route)
│   │   ├── Trip.js               # Trip lifecycle (PENDING→ONGOING→COMPLETED)
│   │   ├── StudentAssignment.js  # Student ↔ Bus ↔ Stop mapping
│   │   └── StopEvent.js          # ARRIVED/LEFT/SOS event log
│   ├── controllers/              # 13 controller files
│   ├── routes/                   # 11 route files
│   ├── middleware/               # auth, role, validation, sanitization
│   ├── utils/                    # ETA, geo, email, push, logging
│   ├── inMemory/                 # In-memory activeTrips cache
│   └── scripts/                  # Database seeder
├── frontend/
│   ├── src/
│   │   ├── pages/                # 15 page components
│   │   ├── components/           # 14 reusable components
│   │   ├── hooks/                # useSocket, useGeolocation, useAuth, useWakeLock
│   │   ├── context/              # AuthContext, ThemeContext
│   │   ├── utils/                # API, debounce, ETA, map, notifications, offline
│   │   ├── constants/            # API URLs, geo constants
│   │   ├── main.jsx              # Router + entry point
│   │   └── index.css             # Global styles
│   ├── public/
│   │   ├── sw.js                 # Service worker
│   │   ├── manifest.json         # PWA manifest
│   │   ├── offline.html          # Offline fallback
│   │   └── markers/              # Custom map markers
│   └── vite.config.js
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **MongoDB** (Atlas cluster or local instance)
- npm or yarn

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

Create `.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?appName=TrackMate
DB_NAME=TrackMatev1
JWT_SECRET=your-secret-key
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# OSRM (public demo server — for production, self-host)
OSRM_BASE_URL=http://router.project-osrm.org

# Auto-end stale trips after N hours
STALE_TRIP_HOURS=12

# Email (Brevo HTTP API)
EMAIL_USER=your-email@gmail.com
BREVO_API_KEY=xkeysib-...

# Push Notifications (generate: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=mailto:admin@trackmate.com
```

Start the server:

```bash
npm run dev     # Development (nodemon)
npm start       # Production
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env`:

```env
# Leave commented for local dev (auto-detects localhost/LAN)
# VITE_BACKEND_URL=https://your-backend.onrender.com

VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
VITE_MIN_UPDATE_INTERVAL_MS=1000
```

Start the dev server:

```bash
npm run dev     # Vite dev server on port 5173
npm run build   # Production build
```

### 4. Default Accounts

On first startup, the server creates a default admin:

- **Username:** `admin`
- **Password:** `admin123`

---

## 🔑 API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | ✗ | Login (rate-limited: 10/15min) |
| POST | `/api/auth/register` | ✗ | Student self-registration (rate-limited: 5/hr) |
| GET | `/api/auth/me` | ✓ | Get current user profile |
| PUT | `/api/auth/profile` | ✓ | Update profile / change password |
| POST | `/api/auth/forgot-password` | ✗ | Reset password to roll number |

### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/dashboard` | Admin | Dashboard statistics |
| GET | `/api/admin/active-trips` | Admin | All active trips |
| GET | `/api/admin/live-buses` | Admin | Live bus positions |
| GET | `/api/admin/events` | Admin | Event history |
| DELETE | `/api/admin/events` | Admin | Clear events |
| POST | `/api/admin/assign` | Admin | Assign student to bus/stop |
| GET | `/api/admin/assignments` | Admin | All assignments |
| PUT | `/api/admin/assignments/:id` | Admin | Update assignment |
| DELETE | `/api/admin/assignments/:id` | Admin | Delete assignment |
| GET | `/api/admin/analytics` | Admin | Trip analytics |
| GET | `/api/admin/export-csv` | Admin | Export trips as CSV |

### Buses, Routes, Stops, Drivers, Students

Full CRUD operations for each entity — see route files for complete list.

### Driver

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/driver/start-trip` | Driver | Start a trip |
| POST | `/api/driver/end-trip/:tripId` | Driver | End a trip |
| GET | `/api/driver/active-trip` | Driver | Get driver's active trip |
| GET | `/api/driver/assigned-bus` | Driver | Get assigned bus |

### Student

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/student/assignment` | Student | Get bus/stop assignment |
| GET | `/api/student/eta` | Student | Get ETA to student's stop |
| GET | `/api/student/live-trip` | Student | Get live trip data |
| POST | `/api/students/missed-bus` | Student | Report missed bus |
| GET | `/api/students/redirect-status` | Student | Check redirect status |
| POST | `/api/students/cancel-redirect` | Student | Cancel redirect |

### Public (No Auth)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/public/buses` | ✗ | List all buses with active status |
| GET | `/api/public/track/:busIdentifier` | ✗ | Get tracking data for a bus |

### WebSocket Events

| Event | Direction | Description |
|---|---|---|
| `auth:token` | Client → Server | Authenticate WebSocket connection |
| `auth:ready` | Server → Client | Authentication confirmed |
| `driver:location_update` | Client → Server | Driver GPS update |
| `trip:location_update` | Server → Client | Broadcast bus location |
| `trip:eta_update` | Server → Client | Broadcast ETA updates |
| `trip:stop_event` | Server → Client | Stop arrival/departure |
| `student:subscribe` | Client → Server | Subscribe to a trip |
| `public:subscribe` | Client → Server | Public subscribe to a trip |
| `bus:trip_started` | Server → Client | Trip started notification |
| `driver:sos` | Client → Server | Driver SOS alert |
| `stats:live_visitors` | Server → Client | Live visitor count |

---

## 🌍 Deployment

### Backend (Render)

- Deploy Node.js web service
- Set all `.env` variables in Render dashboard
- Health check endpoint: `/ping` (beautiful status page)
- Keep-alive via UptimeRobot pinging `/ping`

### Frontend (Vercel)

- Deploy with `vercel.json` (SPA rewrites configured)
- Set `VITE_BACKEND_URL` in Vercel environment variables
- Configure `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 📊 Database Schema

```
User ──────────► Bus ◄── Route
  │                │        │
  │         StudentAssignment │
  │              │        │
  │              ▼        ▼
  │            Stop     Trip ──► StopEvent
  │                      │
  │                   locations[]
  │                   lastLocation
  └── pushSubscription
```

---

## 👥 Team

**Department:** Computer Science & Engineering  
**Institution:** Ramachandra College of Engineering, Eluru, Andhra Pradesh  

| Name | Roll Number | Role |
|---|---|---|
| Maganti Praveen Sai | 22ME1A05G5 | Full Stack Developer & System Architect |
| Chandu Anand Sai Vivek | 23ME5A0512 | Backend Developer |
| Mamidibattula Chandra Sreya | 22ME1A05G6 | Frontend Developer |
| Perla Kirthana | 22ME1A05H8 | Frontend & Documentation Support |

**Mentor:** Prof./Ms. Rajeswari Bolla, CSE Department

---

## 📄 License

This project is developed as an academic capstone project for B.Tech CSE (2022-2026) at RCE, Eluru.
