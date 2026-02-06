# TrackMate — Project Documentation

> Comprehensive technical documentation covering architecture, implementation, database schemas, API endpoints, real-time communication, frontend structure, and all logic used in the TrackMate college bus tracking system.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Design (MongoDB Schemas)](#4-database-design-mongodb-schemas)
5. [Backend Architecture](#5-backend-architecture)
6. [REST API Endpoints](#6-rest-api-endpoints)
7. [Real-Time Communication (Socket.IO)](#7-real-time-communication-socketio)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Real-Time Location Tracking Engine](#10-real-time-location-tracking-engine)
11. [ETA Calculation System](#11-eta-calculation-system)
12. [Geofence-Based Stop Detection](#12-geofence-based-stop-detection)
13. [Push Notification System](#13-push-notification-system)
14. [Email Service](#14-email-service)
15. [Admin Analytics & Reporting](#15-admin-analytics--reporting)
16. [Map Components](#16-map-components)
17. [PWA (Progressive Web App)](#17-pwa-progressive-web-app)
18. [Security Implementation](#18-security-implementation)
19. [Configuration & Constants](#19-configuration--constants)
20. [Outcomes & Results](#20-outcomes--results)

---

## 1. Project Overview

### What is TrackMate?

TrackMate is a **real-time college bus tracking Progressive Web Application (PWA)** designed to help students, drivers, and administrators monitor and manage college bus transportation. The system provides live GPS tracking of buses, automatic ETA calculations, push notification alerts, and a comprehensive fleet management dashboard.

### Problem Statement

College students face uncertainty about bus arrival times, leading to long wait times at stops and missed buses. Administrators lack visibility into fleet operations, and there's no efficient way to communicate bus status to students in real time.

### Solution

TrackMate solves this by providing:
- **Students** — Live tracking of their assigned bus with real-time ETA to their stop
- **Drivers** — Easy trip management with automatic stop detection and location broadcasting
- **Admins** — Fleet oversight with analytics, student/driver/bus/route management, and live monitoring

### How It Works

1. **Admin** creates buses, routes (with stops drawn on map), drivers, and assigns students to buses/stops
2. **Driver** starts a trip → the app begins broadcasting GPS location via WebSocket
3. **Backend** receives GPS → detects approaching stops via geofencing → calculates ETAs → pushes updates
4. **Student** sees live bus position on map, receives push notifications when bus is near their stop
5. **Trip ends** → data stored for analytics; segment travel times updated for better future ETAs

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)              │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  Admin   │  │  Driver  │  │ Student  │  (3 Dashboards)│
│  │Dashboard │  │Dashboard │  │Dashboard │               │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘               │
│       │              │              │                     │
│  ┌────┴──────────────┴──────────────┴────┐               │
│  │    Axios (REST)  +  Socket.IO Client  │               │
│  └───────────────┬───────────────────────┘               │
└──────────────────┼───────────────────────────────────────┘
                   │  HTTP + WebSocket
┌──────────────────┼───────────────────────────────────────┐
│                  │      BACKEND (Node.js + Express)      │
│  ┌───────────────┴──────────────────────┐                │
│  │   Express REST API  +  Socket.IO     │                │
│  └───────┬──────────────────┬───────────┘                │
│          │                  │                             │
│  ┌───────┴───────┐  ┌──────┴──────────┐                 │
│  │  Controllers  │  │  Location Engine │                 │
│  │  (12 files)   │  │  (Real-time GPS) │                 │
│  └───────┬───────┘  └──────┬──────────┘                 │
│          │                  │                             │
│  ┌───────┴──────────────────┴───────────┐                │
│  │          MongoDB (Mongoose)          │                │
│  │  7 Models | In-Memory Trip Cache     │                │
│  └──────────────────────────────────────┘                │
│                                                          │
│  External Services:                                      │
│  • OSRM (Routing/ETA)  • Gmail (Emails)  • Web Push     │
└──────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Driver GPS → Backend**: Driver's browser sends GPS coordinates via Socket.IO every 1s
2. **Backend Processing**: Location engine processes coordinates — updates DB, detects stops, computes ETAs
3. **Backend → Students**: Processed data emitted to subscribed students via Socket.IO rooms
4. **REST API**: All CRUD operations (buses, routes, students, etc.) use standard HTTP REST endpoints
5. **Push Notifications**: Triggered server-side when conditions met (proximity, arrival, SOS)

---

## 3. Technology Stack

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 18+ | JavaScript runtime |
| **Express** | 4.19 | HTTP framework, REST API routing, middleware |
| **Socket.IO** | 4.7 | Real-time bidirectional WebSocket communication |
| **Mongoose** | 7.6 | MongoDB ODM — schema definitions, validation, queries |
| **jsonwebtoken** | 9.0 | JWT token generation and verification for authentication |
| **bcryptjs** | 3.0 | Password hashing (10 salt rounds) |
| **nodemailer** | 8.0 | Email sending (Gmail SMTP) for welcome emails |
| **web-push** | 3.6 | Server-side VAPID push notification delivery |
| **@turf/turf** | 6.5 | Geospatial calculations — point projection on lines, distance |
| **express-rate-limit** | 8.2 | Rate limiting on auth endpoints |
| **dotenv** | 16.3 | Environment variable configuration |
| **cors** | 2.8 | Cross-origin resource sharing |
| **nodemon** | 3.1 | Development auto-restart on file changes |

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.3 | UI component library |
| **Vite** | 7.2 | Build tool — fast HMR, ES module bundling |
| **React Router** | 6.27 | Client-side routing with nested route guards |
| **Tailwind CSS** | 3.4 | Utility-first CSS framework for styling |
| **Leaflet** | 1.9 | Map rendering engine |
| **react-leaflet** | 4.2 | React bindings for Leaflet maps |
| **Socket.IO Client** | 4.7 | WebSocket client for real-time updates |
| **Axios** | 1.6 | HTTP client with interceptors for API calls |
| **react-hot-toast** | 2.6 | Toast notification UI |
| **lucide-react** | 0.561 | Icon library (100+ icons used) |
| **framer-motion** | 12.23 | Animation library |
| **@dnd-kit** | core + sortable | Drag-and-drop for stop reordering in map editor |
| **leaflet.pm** | — | Leaflet drawing plugin for route creation on map |

### External Services

| Service | Purpose |
|---------|---------|
| **MongoDB Atlas** | Cloud-hosted MongoDB database |
| **OSRM** | Open Source Routing Machine — driving distance/duration calculations |
| **Gmail SMTP** | Welcome email delivery via nodemailer |
| **Web Push (VAPID)** | Browser push notifications for proximity/arrival/SOS alerts |

---

## 4. Database Design (MongoDB Schemas)

### 4.1 User Model

Stores all users (admin, driver, student) in a single collection with role-based differentiation.

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `username` | String | ✅ | ✅ | — | Login identifier (roll number for students) |
| `password` | String | ✅ | — | — | bcrypt hashed password |
| `role` | String (enum) | ✅ | — | — | `'admin'`, `'driver'`, or `'student'` |
| `name` | String | — | — | — | Full name |
| `phone` | String | — | — | — | Phone number |
| `email` | String | — | ✅ (sparse) | — | Email (validated regex, unique when set) |
| `firstLogin` | Boolean | — | — | `true` | Forces password change on first login |
| `driverMeta.bus` | ObjectId → Bus | — | — | `null` | Bus assigned to this driver |
| `pushSubscription` | Object | — | — | `null` | Web Push subscription JSON |
| `stopCoordinates` | `{lat, lng}` | — | — | — | Student's stop GPS coordinates |
| `assignedBusId` | ObjectId → Bus | — | — | — | *(Deprecated — use StudentAssignment)* |
| `assignedStopId` | Number | — | — | — | *(Deprecated — use StudentAssignment)* |
| `createdAt` | Date | auto | — | — | Mongoose timestamps |
| `updatedAt` | Date | auto | — | — | Mongoose timestamps |

**Logic**: The `email` field uses `sparse: true` indexing — allows multiple documents with `null` email but ensures uniqueness when a value is set.

---

### 4.2 Bus Model

Represents a physical bus in the fleet.

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `name` | String | ✅ | — | — | Display name (e.g., "Bus A") |
| `numberPlate` | String | ✅ | ✅ | — | License plate (auto-uppercased) |
| `capacity` | Number | — | — | `40` | Seating capacity (min: 1) |
| `driver` | ObjectId → User | — | — | `null` | Assigned driver |
| `route` | ObjectId → Route | — | — | `null` | Assigned route |
| `isActive` | Boolean | — | — | `true` | Whether bus is active in fleet |
| `lastKnownLocation` | `{lat, lng, updatedAt}` | — | — | — | Most recent GPS position |

**Logic**: When a bus is deleted, the system checks for active trips first (blocks deletion if found) and clears the assigned driver's `driverMeta.bus`.

---

### 4.3 Route Model

Defines a bus route with embedded stops and segment statistics.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | String | ✅ | — | Route display name |
| `geojson` | Object | — | `null` | Full route geometry (GeoJSON LineString) for map rendering |
| `stops` | Array of `{name, lat, lng, seq}` | — | — | Ordered stop list embedded in the route |
| `segStats` | Array of `{avgSec, samples}` | — | — | Per-segment average travel time (between consecutive stops) |

**Logic**: `stops` is an embedded array for fast reads. Each `segStats[i]` tracks the average travel time between `stops[i]` and `stops[i+1]`, starting at `{avgSec: 120, samples: 1}` (2 minutes default). Updated via exponential moving average after each trip.

---

### 4.4 Stop Model

Physical stop documents that mirror the Route's embedded stops. Used for student assignments and detailed queries.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | String | ✅ | — | Stop name |
| `latitude` | Number | ✅ | — | GPS latitude |
| `longitude` | Number | ✅ | — | GPS longitude |
| `sequence` | Number | ✅ | — | Order in route (0-indexed) |
| `route` | ObjectId → Route | ✅ | — | Parent route reference |
| `averageTravelMinutes` | Number | — | `2` | Avg travel time from previous stop (min: 1) |

**Logic**: Stays in sync with Route.stops via `syncStopsForRoute()` — on route update, missing stops are created, orphaned stops (and their StudentAssignments) are deleted.

---

### 4.5 Trip Model

Records an individual bus trip (journey from start to end).

| Field | Type | Required | Indexed | Default | Description |
|-------|------|----------|---------|---------|-------------|
| `bus` | ObjectId → Bus | ✅ | ✅ | — | Which bus is making this trip |
| `driver` | ObjectId → User | ✅ | ✅ | — | Which driver is operating |
| `route` | ObjectId → Route | ✅ | — | — | Which route is being followed |
| `status` | String (enum) | — | ✅ | `'PENDING'` | `'PENDING'`, `'ONGOING'`, or `'COMPLETED'` |
| `currentStopIndex` | Number | — | — | `0` | Index of the stop the bus is currently at/approaching |
| `startedAt` | Date | — | — | `Date.now` | When the trip started |
| `endedAt` | Date | — | — | — | When the trip was completed |
| `lastLocation` | `{lat, lng, updatedAt}` | — | — | — | Most recent GPS position |
| `locations` | Array of `{lat, lng, speed, heading, timestamp}` | — | — | — | GPS breadcrumb trail (max 1000 entries via `$slice`) |

**Logic**: Trips have a stale detection mechanism — if a trip is older than `STALE_TRIP_HOURS` (default 12), it's auto-completed on the next status check. The `locations` array stores up to 1000 GPS breadcrumbs using MongoDB's `$slice` operator to cap the array.

---

### 4.6 StudentAssignment Model

Links a student to a bus and stop, with notification preferences.

| Field | Type | Required | Indexed | Default | Description |
|-------|------|----------|---------|---------|-------------|
| `student` | ObjectId → User | ✅ | ✅ | — | Student user reference |
| `bus` | ObjectId → Bus | ✅ | ✅ | — | Assigned bus |
| `stop` | ObjectId → Stop | — | ✅ | `null` | Assigned pickup/drop stop |
| `notificationToken` | String | — | — | — | Legacy push token |
| `notificationPreferences.enabled` | Boolean | — | — | `true` | Push notifications enabled |
| `notificationPreferences.proximityMinutes` | Number | — | — | `5` | Alert when bus is X minutes away (1–30) |
| `notificationPreferences.proximityMeters` | Number | — | — | `500` | Alert when bus is X meters away (100–2000) |
| `notificationPreferences.lastProximityAlertTrip` | ObjectId → Trip | — | — | — | Dedup: only one proximity alert per trip |
| `notificationPreferences.arrivalAlert` | Boolean | — | — | `true` | Alert on bus arrival at student's stop |

**Compound Index**: `{ bus: 1, student: 1 }` for efficient lookups of all students on a bus.

**Logic**: `lastProximityAlertTrip` prevents duplicate proximity alerts for the same trip — once a student receives a "bus is approaching" notification, they won't get another until the next trip.

---

### 4.7 StopEvent Model

Records individual stop arrival/departure/SOS events during a trip.

| Field | Type | Required | Indexed | Default | Description |
|-------|------|----------|---------|---------|-------------|
| `trip` | ObjectId → Trip | ✅ | ✅ | — | Parent trip |
| `stop` | ObjectId → Stop | — | ✅ | — | Stop reference |
| `stopIndex` | Number | ✅ | — | — | Stop sequence index |
| `stopName` | String | ✅ | — | — | Stop name (denormalized for fast display) |
| `status` | String (enum) | ✅ | ✅ | — | `'ARRIVED'`, `'LEFT'`, or `'SOS'` |
| `message` | String | — | — | — | Optional message (used for SOS details) |
| `timestamp` | Date | — | — | `Date.now` | When the event occurred |
| `location` | `{lat, lng}` | — | — | — | GPS position at event time |
| `source` | String (enum) | — | — | `'auto'` | `'auto'` (geofence detected) or `'manual'` (driver pressed button) |
| `etaMinutes` | Number | — | — | — | ETA snapshot at event time (min: 0) |

**Logic**: Events can be generated automatically by the geofence system or manually by the driver pressing arrival/departure buttons. The `source` field distinguishes between the two.

---

## 5. Backend Architecture

### Directory Structure

```
backend/
├── server.js                 # Entry point — Express + Socket.IO setup
├── config/
│   ├── db.js                 # MongoDB connection (mongoose.connect)
│   └── constants.js          # All configuration constants
├── controllers/              # Business logic (12 controller files)
│   ├── authController.js     # Login, register, profile, password
│   ├── adminController.js    # Dashboard stats, assignments, analytics, CSV export
│   ├── busController.js      # Bus CRUD with driver metadata sync
│   ├── driverController.js   # Trip management, location sharing, stop events
│   ├── routeController.js    # Route CRUD with stop synchronization
│   ├── stopController.js     # Stop CRUD with route refresh
│   ├── studentController.js  # Student data, ETA, preferences, assignment
│   ├── tripController.js     # Trip lifecycle (start, active, end, history)
│   ├── eventController.js    # Stop event queries
│   ├── notificationController.js  # Push subscription and sending
│   ├── locationController.js # ★ Core real-time GPS processing engine
│   └── studentAdminController.js  # Admin student account management
├── middleware/
│   ├── authMiddleware.js     # JWT token verification
│   ├── roleMiddleware.js     # Role-based access control
│   └── validateMiddleware.js # Input sanitization, ObjectId validation
├── models/                   # 7 Mongoose models (see Section 4)
├── routes/                   # 10 Express route files
├── utils/
│   ├── emailService.js       # Nodemailer Gmail transport
│   ├── etaCalculator.js      # OSRM + fallback ETA computation
│   ├── geoUtils.js           # Haversine distance, line projection
│   ├── segmentStats.js       # Segment travel time learning
│   ├── notificationService.js # Push notification delivery
│   └── logger.js             # Console logging utility
├── inMemory/
│   └── activeTrips.js        # In-memory trip state cache (Map)
└── scripts/
    └── seed.js               # Database seeding (admin account)
```

### Request Flow

```
Client Request
    │
    ▼
Express Middleware Chain:
    ├── cors()
    ├── express.json()
    ├── express-rate-limit (auth routes only)
    ├── authMiddleware (JWT verify → req.user)
    ├── roleMiddleware (role check)
    ├── sanitizeInput (NoSQL injection protection)
    │
    ▼
Controller Function
    ├── Business logic
    ├── Mongoose queries
    ├── Socket.IO emits (if real-time)
    │
    ▼
JSON Response → Client
```

### Middleware Details

| Middleware | Applied To | What It Does |
|-----------|-----------|-------------|
| `authMiddleware` | Most routes | Extracts Bearer token → `jwt.verify()` → `User.findById()` → sets `req.user` |
| `roleMiddleware('admin')` | Admin routes | Checks `req.user.role` is in allowed roles, returns 403 otherwise |
| `roleMiddleware('driver')` | Driver routes | Same pattern for driver role |
| `roleMiddleware('student')` | Student routes | Same pattern for student role |
| `sanitizeInput` | Auth routes | Recursively scans `req.body` for keys starting with `$` (NoSQL injection) |
| `validateObjectId` | Routes with `:id` params | Validates MongoDB ObjectId format |
| `validateCoordinates` | Location routes | Validates `lat` ∈ [-90, 90] and `lng` ∈ [-180, 180] |

### Rate Limiting

| Endpoint | Window | Max Requests | Purpose |
|----------|--------|-------------|---------|
| `POST /api/auth/login` | 15 minutes | 10 | Brute-force protection |
| `POST /api/auth/register` | 1 hour | 5 | Registration spam prevention |
| `GET /api/admin/export-trips` | 15 minutes | 5 | CSV export abuse prevention |

---

## 6. REST API Endpoints

### 6.1 Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | ❌ | Login with username/password → returns JWT + user object |
| `POST` | `/api/auth/register` | ❌ | Student self-registration (name, roll number, email) → password auto-set to roll number |
| `GET` | `/api/auth/me` | ✅ | Get current authenticated user's profile |
| `PUT` | `/api/auth/profile` | ✅ | Update profile (name, phone, email, password) |

**Login Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "...", "username": "ad1", "role": "admin",
    "name": "Admin", "firstLogin": true
  },
  "firstLogin": true
}
```

**Registration Request:**
```json
{
  "name": "Sai Kumar",
  "username": "21B01A0542",
  "email": "sai@example.com"
}
```

---

### 6.2 Admin (`/api/admin`) — Requires `admin` role

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/dashboard` | Dashboard stats: buses, drivers, students, active trips counts |
| `GET` | `/api/admin/live-buses` | Real-time positions of all buses with ongoing trips + student counts |
| `GET` | `/api/admin/analytics?days=7` | Trip analytics: total trips, avg duration, per-bus stats, today's events |
| `GET` | `/api/admin/export-trips?days=30&busId=...` | Download completed trips as CSV |
| `GET` | `/api/admin/trips` | List all ongoing trips with populated bus/driver/route |
| `GET` | `/api/admin/events?limit=50` | Recent stop events (ARRIVED/LEFT/SOS) |
| `DELETE` | `/api/admin/events` | Clear all stop events |
| **Student Assignments** | | |
| `POST` | `/api/admin/assignments` | Assign student to bus + stop (auto-creates student if needed) |
| `GET` | `/api/admin/assignments` | List all assignments with populated references |
| `PUT` | `/api/admin/assignments/:id` | Update assignment |
| `DELETE` | `/api/admin/assignments/:id` | Delete assignment |
| **Driver Management** | | |
| `POST` | `/api/admin/drivers` | Create driver account |
| `GET` | `/api/admin/drivers` | List all drivers |
| `PUT` | `/api/admin/drivers/:id` | Update driver account |
| `DELETE` | `/api/admin/drivers/:id` | Delete driver (unassigns from buses) |
| **Student Management** | | |
| `POST` | `/api/admin/students` | Create student account (optional bus/stop assignment) |
| `GET` | `/api/admin/students` | List all students |
| `PUT` | `/api/admin/students/:id` | Update student account |
| `DELETE` | `/api/admin/students/:id` | Delete student (cascades to assignments) |

---

### 6.3 Buses (`/api/buses`) — Requires `admin` role

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/buses` | Create bus (name, numberPlate, capacity, driver, route) |
| `GET` | `/api/buses` | List all buses with populated driver and route |
| `PUT` | `/api/buses/:id` | Update bus (handles driver reassignment metadata) |
| `DELETE` | `/api/buses/:id` | Delete bus (blocked if active trip exists) |

---

### 6.4 Routes (`/api/routes`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/routes` | `admin` | Create route with GeoJSON geometry and stops |
| `GET` | `/api/routes` | any auth | List all routes (sorted newest first) |
| `PUT` | `/api/routes/:id` | `admin` | Update route (preserves segment stats, syncs Stop documents) |
| `DELETE` | `/api/routes/:id` | `admin` | Delete route (cascades: stops → assignments → bus unlink) |

---

### 6.5 Stops (`/api/stops`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/stops` | `admin` | Create a stop |
| `GET` | `/api/stops/:routeId` | any auth | Get all stops for a route (lazy-inits from Route.stops if needed) |
| `PUT` | `/api/stops/:id` | `admin` | Update a stop (refreshes parent route) |
| `DELETE` | `/api/stops/:id` | `admin` | Delete a stop (refreshes route, cascades to assignments) |

---

### 6.6 Driver (`/api/driver`) — Requires `driver` role

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/driver/bus` | Get driver's assigned bus (with route) |
| `GET` | `/api/driver/trip` | Get driver's active ongoing trip |
| `POST` | `/api/driver/trips/start` | Start a trip (idempotent — returns existing if already started) |
| `POST` | `/api/driver/trips/location` | Share current GPS location for active trip |
| `POST` | `/api/driver/trips/event` | Record manual stop event (ARRIVED/LEFT) |
| `POST` | `/api/driver/trips/end` | End the active trip |
| `POST` | `/api/driver/approaching` | Manually notify students of approaching stop |

---

### 6.7 Trips (`/api/trips`) — Requires `driver` role

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/trips/start` | Start a trip (validates bus ownership + route) |
| `GET` | `/api/trips/active` | Get active trip (auto-ends stale trips > 12 hours) |
| `POST` | `/api/trips/:tripId/end` | End a specific trip by ID |
| `POST` | `/api/trips/end` | End trip (legacy — reads tripId from body) |
| `DELETE` | `/api/trips/history/today` | Dev utility: delete today's completed trips, reset active trip |

---

### 6.8 Student (`/api/students`) — Requires `student` role

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/students/assignment` | Get student's bus/stop assignment + 5 recent events |
| `GET` | `/api/students/me` | Alias for assignment endpoint |
| `GET` | `/api/students/eta` | Get ETA to assigned stop (live or fallback) |
| `GET` | `/api/students/trip` | Get live trip details with progress info |
| `GET` | `/api/students/buses` | Get all buses with routes/stops (for bus selection) |
| `PUT` | `/api/students/assignment` | Update own bus/stop assignment |
| `GET` | `/api/students/preferences` | Get push notification preferences |
| `PUT` | `/api/students/preferences` | Update push notification preferences |
| `POST` | `/api/students/notifications` | Register push notification token |

**ETA Response:**
```json
{
  "etaMs": 300000,
  "etaMinutes": 5,
  "source": "live"
}
```

**Live Trip Response:**
```json
{
  "trip": { "...trip fields..." },
  "currentStop": { "name": "Main Gate", "seq": 3 },
  "nextStop": { "name": "Library", "seq": 4 },
  "progress": {
    "totalStops": 8,
    "completedStops": 3,
    "percentage": 37.5
  }
}
```

---

### 6.9 Events (`/api/events`) — Requires `admin` role

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/events` | List 100 most recent stop events |
| `GET` | `/api/events/:tripId` | List all events for a specific trip |

---

### 6.10 Notifications (`/api/notifications`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/notifications/subscribe` | ✅ | Save Web Push subscription (validates endpoint) |
| `GET` | `/api/notifications/test-push` | ✅ | Send test notification to self |

---

## 7. Real-Time Communication (Socket.IO)

### Connection Setup

The Socket.IO server runs on the same HTTP server as Express. WebSocket is the primary transport.

**Server Configuration:**
```javascript
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
  transports: ['websocket', 'polling']
});
```

**Client Connection:**
```javascript
const socket = io(API_BASE_URL, {
  transports: ['websocket'],
  autoConnect: true
});
```

### Authentication Flow

1. Client connects to Socket.IO
2. Client emits `auth:token` with JWT token from localStorage
3. Server verifies JWT → attaches `socket.user`
4. Server emits `auth:ready` on success or `auth:error` on failure
5. Client then subscribes to rooms based on role

### Client → Server Events

| Event | Emitted By | Payload | Description |
|-------|-----------|---------|-------------|
| `auth:token` | All clients | `{ token }` | JWT authentication |
| `student:subscribe` | Student | `{}` | Subscribe to assigned bus trip updates |
| `student:unsubscribe` | Student | `{}` | Unsubscribe from trip updates |
| `admin:join` | Admin | `{}` | Join admin notification room |
| `join` | Any | `{ room }` | Legacy room join |
| `driver:location_update` | Driver | `{ tripId, busId, lat, lng, speed, heading, timestamp }` | GPS position update |
| `driver:manual_event` | Driver | `{ tripId, busId, stopIndex, stopName, status }` | Manual ARRIVED/LEFT event |
| `driver:sos` | Driver | `{ tripId, busId, message, location }` | Emergency SOS alert |

### Server → Client Events

| Event | Sent To | Payload | Description |
|-------|---------|---------|-------------|
| `auth:ready` | Socket | `{ userId }` | Authentication successful |
| `auth:error` | Socket | `{ message }` | Authentication failed |
| `trip:subscribed` | Socket | `{ tripId }` | Student subscribed to trip |
| `trip:unsubscribed` | Socket | `{}` | Student unsubscribed |
| `trip:subscription_error` | Socket | `{ message }` | Subscription validation error |
| `trip:location_update` | Room `trip_{id}` | `{ tripId, busId, lat, lng, speed, timestamp }` | Real-time bus position |
| `trip:eta_update` | Room `trip_{id}` | `{ tripId, etas[], etasMap }` | Updated ETAs for all stops |
| `trip:stop_arrived` | Room `trip_{id}` | `{ tripId, stopIndex, stopName, timestamp }` | Bus arrived at stop |
| `trip:stop_left` | Room `trip_{id}` | `{ tripId, stopIndex, stopName, timestamp }` | Bus departed from stop |
| `trip:sos` | Room + Admin | `{ tripId, busId, message, location }` | Emergency SOS broadcast |
| `bus:trip_started` | Broadcast | `{ busId, tripId, message }` | New trip started |
| `admin:trip_updates` | Broadcast | `{ tripId, ... }` | Admin-targeted trip status changes |
| `admin:joined` | Socket | `{}` | Admin room join confirmed |
| `stats:live_visitors` | Broadcast | `{ count }` | Live connected user count |

### Room Structure

| Room Name | Members | Purpose |
|-----------|---------|---------|
| `trip_{tripId}` | Subscribed students + driver | Trip-specific updates |
| `bus_{busId}` | Legacy: students on a bus | Bus-specific events |
| `admin_room` | Admin users | Admin-targeted notifications |

### ETA Heartbeat

A 30-second interval recalculates ETAs for all active trips in the in-memory cache. This ensures students still receive ETA updates even if the driver's GPS signal is intermittent.

---

## 8. Frontend Architecture

### Directory Structure

```
frontend/src/
├── App.jsx                   # Root layout (Navbar + Outlet + Toaster)
├── main.jsx                  # Route definitions + providers
├── index.css                 # Global styles + Tailwind imports
├── context/
│   ├── AuthContext.jsx        # Authentication state management
│   └── ThemeContext.jsx       # Dark/light theme toggle
├── hooks/
│   ├── useAuth.js             # Auth context consumer shortcut
│   ├── useGeolocation.js      # GPS tracking + simulation
│   └── useSocket.js           # Socket.IO singleton + offline buffer
├── pages/
│   ├── Login.jsx              # Login + student registration
│   ├── Profile.jsx            # User profile + password change
│   ├── AdminDashboard.jsx     # Fleet overview + analytics
│   ├── DriverDashboard.jsx    # Trip management + GPS broadcasting
│   ├── StudentDashboard.jsx   # Bus tracking + ETA + notifications
│   ├── ManageBuses.jsx        # Bus CRUD
│   ├── ManageDrivers.jsx      # Driver CRUD
│   ├── ManageRoutes.jsx       # Route CRUD with map editor
│   ├── ManageStudents.jsx     # Student CRUD
│   ├── ManageAssignments.jsx  # Student-bus-stop assignments
│   ├── DriverSimulator.jsx    # GPS simulation tool
│   ├── Trips.jsx              # Trip history
│   └── TripAnalytics.jsx      # Trip analytics dashboard
├── components/
│   ├── AdminMap.jsx           # Fleet map (all active buses)
│   ├── DriverMap.jsx          # Driver view map (position + route)
│   ├── StudentMap.jsx         # Student view map (bus + stop)
│   ├── MapEditor.jsx          # Interactive route/stop drawing tool
│   ├── MapView.jsx            # General map wrapper
│   ├── Navbar.jsx             # Navigation bar (role-aware)
│   ├── Drawer.jsx             # Centered modal/drawer for forms
│   ├── ProtectedRoute.jsx     # Role-based route guard
│   ├── NotificationToggle.jsx # Push notification toggle UI
│   ├── ConfirmDialog.jsx      # Delete confirmation dialog
│   ├── Toast.jsx              # Custom toast component
│   ├── BusCard.jsx            # Bus display card
│   └── TrackingControls.jsx   # GPS tracking start/stop controls
├── constants/
│   ├── api.js                 # API base URL (auto-detects LAN)
│   └── geo.js                 # Map defaults, tile URLs, center coordinates
└── utils/
    └── api.js                 # Axios instance with interceptors
```

### Routing Configuration

| Path | Component | Roles | Description |
|------|-----------|-------|-------------|
| `/` | — | — | Redirects to `/login` |
| `/login` | `Login` | public | Login + registration |
| `/profile` | `Profile` | any auth | User profile |
| `/admin` | `AdminDashboard` | admin | Fleet overview |
| `/admin/buses` | `ManageBuses` | admin | Bus management |
| `/admin/drivers` | `ManageDrivers` | admin | Driver management |
| `/admin/routes` | `ManageRoutes` | admin | Route management |
| `/admin/students` | `ManageStudents` | admin | Student management |
| `/admin/assignments` | `ManageAssignments` | admin | Assignment management |
| `/admin/trips` | `Trips` | admin | Trip history |
| `/admin/analytics` | `TripAnalytics` | admin | Analytics |
| `/driver` | `DriverDashboard` | driver | Trip management |
| `/driver/simulator` | `DriverSimulator` | driver, admin | GPS simulator |
| `/student` | `StudentDashboard` | student | Bus tracking |

### Provider Hierarchy

```
<React.StrictMode>
  <ThemeProvider>          ← Dark/light theme context
    <AuthProvider>         ← JWT token + user session
      <RouterProvider>     ← React Router v6
        <App>              ← Navbar + Outlet + Toaster
          <ProtectedRoute> ← Role guard
            <Page />       ← Individual dashboard/page
```

### Custom Hooks

#### `useAuth()`
Returns authentication context: `{ user, token, login, logout, loading, setUser }`.

#### `useSocket(handlers)`
Manages a singleton Socket.IO connection. Features:
- **Auto-authentication**: Sends JWT on connect/reconnect
- **Offline buffering**: GPS updates are queued when disconnected and flushed on reconnect
- **Retry logic**: Failed emits retry 3 times with exponential backoff
- **Returns**: `{ socket, isConnected, isAuthenticated, bufferSize, emitLocation }`

#### `useGeolocation({ onPosition, simulate, simulatedPath })`
GPS tracking hook with simulation support. Features:
- **Real mode**: Uses `navigator.geolocation.watchPosition` (high accuracy, 5s max age, 15s timeout)
- **Simulation mode**: Cycles through a path array at simulated speed (~30 km/h)
- **Throttling**: Minimum 1s between position updates
- **Returns**: `{ isTracking, permissionStatus, lastPosition, error, pingsSent, startTracking, stopTracking }`

### State Management Pattern

The app uses **React Context + Local State** (no Redux):
- **Global state**: Auth (user, token) and Theme (dark/light) via Context
- **Page-level state**: Each dashboard manages its own data via `useState` + `useEffect` API calls
- **Real-time state**: Socket.IO events update page state directly via event handlers
- **Persistence**: `localStorage` for auth token, user object, theme preference, and student event history

---

## 9. Authentication & Authorization

### Registration Flow (Student Self-Registration)

```
1. Student fills form: Name, Roll Number, Email
2. Frontend POST /api/auth/register
3. Backend:
   a. Checks for duplicate username (roll number) and email
   b. Auto-sets password = roll number (bcrypt hashed)
   c. Creates User with { role: 'student', firstLogin: true }
   d. Sends welcome email asynchronously (fire-and-forget)
   e. Returns success message (NO auto-login)
4. Frontend shows success popup: "Account Created! Check your email"
5. Student clicks "Go to Sign In" → logs in with roll number / roll number
6. firstLogin = true → redirected to /profile
7. Student MUST change password → saves → firstLogin = false → redirected to dashboard
```

### Login Flow

```
1. Student/Driver/Admin enters username + password
2. Frontend POST /api/auth/login
3. Backend:
   a. Finds user by username
   b. Verifies password (bcrypt compare; migrates plain-text legacy passwords)
   c. Signs JWT with { id, role, username } (12h expiry)
   d. Returns { token, user, firstLogin }
4. Frontend:
   a. Stores token + user in localStorage
   b. Sets axios Authorization header
   c. Authenticates Socket.IO connection
   d. If firstLogin → redirect to /profile
   e. Else → redirect to role dashboard (/admin, /driver, /student)
```

### JWT Token Structure

```json
{
  "id": "MongoDB_User_ObjectId",
  "role": "admin|driver|student",
  "username": "ad1"
}
```
- **Algorithm**: HS256
- **Expiry**: 12 hours
- **Storage**: `localStorage('tm_token')`

### Password Security

- **Hashing**: bcrypt with 10 salt rounds
- **First Login**: Forces password change before accessing any feature
- **Legacy Migration**: Old plain-text passwords (not starting with `$2`) are auto-migrated to bcrypt on successful login
- **Profile Change**: Requires current password verification before allowing new password

### Authorization (Role-Based Access Control)

| Role | Access |
|------|--------|
| `admin` | All management endpoints, analytics, CSV export, fleet monitoring |
| `driver` | Trip management, GPS location sharing, stop events, SOS |
| `student` | View own assignment, bus tracking, ETA, notification preferences |

Protected by middleware chain: `authMiddleware` (JWT verify) → `roleMiddleware(allowedRoles)` (role check).

---

## 10. Real-Time Location Tracking Engine

The core of TrackMate is the location tracking engine in `locationController.js`. This is the most complex component in the system.

### How Location Tracking Works

```
Driver GPS (every 1s)
    │
    ▼
handleDriverLocationUpdate()
    │
    ├── 1. Throttle check (MIN_UPDATE_INTERVAL_MS = 1000ms)
    ├── 2. Get/rebuild in-memory trip state
    ├── 3. Persist to DB (Bus.lastKnownLocation + Trip.lastLocation + locations[])
    ├── 4. Emit trip:location_update to all subscribed students
    │
    ├── 5. GEOFENCE DETECTION (look-ahead: next 5 stops)
    │      ├── For each upcoming stop:
    │      │   ├── Calculate distance (Haversine)
    │      │   ├── If within RADIUS_METERS (75m):
    │      │   │   ├── Start dwell timer (SUSTAIN_TIME_MS = 3s)
    │      │   │   └── If sustained → ARRIVED event
    │      │   ├── If was ARRIVED and now > LEAVE_RADIUS_METERS (80m):
    │      │   │   └── LEFT event → advance currentStopIndex
    │      │
    ├── 6. UPDATE SEGMENT STATS (learning)
    │      └── On LEFT: calculates observed travel seconds → EMA update
    │
    ├── 7. COMPUTE ETAs
    │      ├── Try OSRM road routing (cached 15s)
    │      ├── Fallback: distance / speed
    │      ├── Smooth via exponential moving average (alpha = 0.25)
    │      └── Emit trip:eta_update if delta > 5 seconds
    │
    └── 8. PUSH NOTIFICATIONS
           ├── Check each student's assignment on this bus
           ├── If proximityMeters/proximityMinutes threshold crossed
           └── Send Web Push (deduplicate per trip via lastProximityAlertTrip)
```

### In-Memory Trip State Cache

Each active trip maintains an in-memory state object (stored in a `Map`):

```javascript
{
  tripId: "...",
  trip: { /* Mongoose Trip doc */ },
  route: { /* Mongoose Route doc with stops */ },
  routeStops: [ /* Merged and sorted stops */ ],
  lastPosition: { lat, lng, timestamp },
  lastEmitTime: timestamp,
  etaCache: { stopId: etaMs, ... },
  insideWindow: { index: number, enteredAt: timestamp },
  arrivalLog: Set<stopIndex>,     // Which stops have been ARRIVED
  currentStopIndex: number
}
```

**Periodic cleanup**: Every 10 minutes, stale/completed trips are purged from the Map.

### Speed Calculation

```
if (provided GPS speed > 0)  → use it directly
else if (can compute from last position + time delta):
    speed = distanceMeters(lastPos, currentPos) / deltaSeconds
    if (speed >= MIN_SPEED_MPS = 0.8 m/s) → use computed speed
else → use ASSUMED_SPEED_MPS (5 m/s ≈ 18 km/h)
```

---

## 11. ETA Calculation System

### Multi-Source ETA Strategy

TrackMate uses a layered approach to ETA calculation, with each layer serving as a fallback:

#### Layer 1: OSRM Road Routing (Primary)

```
1. Build coordinate array: [currentPosition, stop1, stop2, ...]
2. Query OSRM: GET /route/v1/driving/{coords}?overview=false&steps=false
3. Extract leg durations (seconds) from response
4. Cache result for 15 seconds (OSRM_CACHE_TTL_MS)
5. Sum durations from current position to each target stop
```

- **Timeout**: 1.5 seconds per OSRM request
- **Caching**: 15-second TTL to reduce API calls
- **Near-stop override**: If within 100m of a stop, use real-time distance/speed instead of cached OSRM

#### Layer 2: Distance / Speed (Fallback)

```
1. For each upcoming stop:
   remainingDistance = remainingDistanceToStop(routeGeoJSON, position, stop)
2. etaMs = (remainingDistance / speedMps) * 1000
```

Uses `@turf/turf` to project the bus position onto the route polyline and calculate the remaining path distance (more accurate than straight-line distance).

#### Layer 3: Segment Historical Averages (Final Fallback)

```
1. For each segment between current stop and target stop:
   etaMs += segStats[segIndex].avgSec * 1000
```

Uses historically learned travel times per segment.

### Exponential Smoothing

Raw ETAs are smoothed to prevent erratic updates:

```
smoothedEta = ETA_ALPHA * rawEta + (1 - ETA_ALPHA) * previousSmoothedEta
```
Where `ETA_ALPHA = 0.25` (new data gets 25% weight).

### Segment Stats Learning

After each `LEFT` event (bus departs a stop), the system records the actual travel time and updates the segment's moving average:

```
newAvg = SEG_ALPHA * observedSeconds + (1 - SEG_ALPHA) * previousAvg
```
Where `SEG_ALPHA = 0.15`. This means the system learns over time and becomes more accurate with each trip.

### ETA Emit Optimization

ETAs are only emitted to clients when the change exceeds `ETA_EMIT_DELTA_MS = 5000ms` for any stop, preventing excessive updates.

---

## 12. Geofence-Based Stop Detection

### How Auto-Detection Works

The system automatically detects when a bus arrives at or departs from a stop using geofencing:

```
For each upcoming stop (look-ahead window = 5):
│
├── Calculate distance = haversine(busPosition, stopPosition)
│
├── ARRIVAL DETECTION:
│   ├── If distance ≤ RADIUS_METERS (75m):
│   │   ├── If NOT already inside geofence:
│   │   │   └── Set insideWindow = { index, enteredAt: now }
│   │   ├── If inside AND (now - enteredAt) ≥ SUSTAIN_TIME_MS (3000ms):
│   │   │   └── ★ Generate ARRIVED event
│   │   │       ├── Persist StopEvent to DB
│   │   │       ├── Emit trip:stop_arrived via Socket.IO
│   │   │       └── Add to arrivalLog
│
├── DEPARTURE DETECTION:
│   ├── If distance > LEAVE_RADIUS_METERS (80m):
│   │   ├── If previously ARRIVED at this stop:
│   │   │   └── ★ Generate LEFT event
│   │   │       ├── Persist StopEvent to DB
│   │   │       ├── Emit trip:stop_left via Socket.IO
│   │   │       ├── Advance currentStopIndex
│   │   │       └── Update segment stats (learning)
```

### Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `RADIUS_METERS` | 75 m | Distance to trigger arrival detection |
| `SUSTAIN_TIME_MS` | 3000 ms | Bus must be within radius for 3 seconds to confirm arrival (filters traffic stops) |
| `LEAVE_RADIUS_METERS` | 80 m | Distance to trigger departure detection (slightly larger than arrival radius to prevent oscillation) |

### Why Sustained Dwell Time?

The 3-second dwell requirement (`SUSTAIN_TIME_MS`) prevents false positives — a bus briefly passing within 75m of a stop (e.g., at a traffic light near a stop) won't trigger an arrival event. The bus must remain within the geofence for 3 consecutive seconds.

### Manual Override

Drivers can also manually trigger ARRIVED/LEFT events via buttons in their dashboard. These events have `source: 'manual'` in the StopEvent record (vs `source: 'auto'` for geofence-detected events).

---

## 13. Push Notification System

### Architecture

```
Backend (web-push library)
    │
    ├── VAPID Keys (public + private)
    │
    ├── Store subscription → User.pushSubscription
    │
    └── Send notification:
        ├── Proximity alert (bus X min/meters away)
        ├── Arrival alert (bus arrived at student's stop)
        └── SOS alert (emergency broadcast)
            │
            ▼
    Browser Push Service (Chrome, Firefox, etc.)
            │
            ▼
    Service Worker receives push event
            │
            ▼
    Shows OS-level notification
```

### Subscription Flow

1. Student clicks "Enable Notifications" on dashboard
2. Frontend registers service worker (`sw.js`)
3. Frontend calls `pushManager.subscribe()` with VAPID public key
4. Receives `PushSubscription` object (endpoint + keys)
5. Frontend sends subscription to `POST /api/notifications/subscribe`
6. Backend validates endpoint (must be HTTPS, not `permanently-removed.invalid`)
7. Stores in `User.pushSubscription`

### Notification Types

| Type | Trigger | Sent To | Content |
|------|---------|---------|---------|
| **Proximity** | Bus within X meters OR X minutes of student's stop | Individual student | "Bus is approaching your stop!" |
| **Arrival** | Bus ARRIVED at student's stop | All students at that stop | "Bus has arrived at [Stop Name]" |
| **SOS** | Driver triggers SOS | All students on the bus | Emergency message with `requireInteraction: true` |
| **Test** | User clicks test button | Self | "Test notification from TrackMate" |

### Deduplication

Proximity alerts are sent at most once per trip per student. The `lastProximityAlertTrip` field in `StudentAssignment.notificationPreferences` tracks which trip the last alert was for.

### Error Handling

When a push send fails with status 404, 410, 400, or 401 (subscription expired/invalid), the backend automatically clears the user's `pushSubscription` to prevent repeated failures.

---

## 14. Email Service

### Implementation

Uses **nodemailer** with Gmail SMTP transport:

```javascript
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD  // Gmail App Password
  }
});
```

### When Emails Are Sent

| Event | Email Content | Sent To |
|-------|--------------|---------|
| Student self-registration | Welcome email with login credentials (roll number as username/password) | Student's email |
| Admin creates student | Welcome email with bus/route/stop assignment details | Student's email |

### Email Template

The welcome email is a styled HTML template containing:
- TrackMate branding
- Account credentials (username + temporary password)
- Bus and route assignment (if assigned via admin)
- Instructions to change password on first login
- Link to the TrackMate app

Emails are sent **asynchronously** (fire-and-forget) so registration doesn't block on email delivery.

---

## 15. Admin Analytics & Reporting

### Dashboard Stats (`GET /api/admin/dashboard`)

Real-time aggregate counts:

```json
{
  "busCount": 10,
  "driverCount": 8,
  "studentCount": 150,
  "activeTrips": 3
}
```

Computed via `Promise.all` on 4 parallel `countDocuments()` queries.

### Live Bus Positions (`GET /api/admin/live-buses`)

Returns all buses with ongoing trips, enriched with student counts:

```json
[{
  "_id": "bus_id",
  "tripId": "trip_id",
  "name": "Bus A",
  "numberPlate": "AP07AB1234",
  "driverName": "John",
  "lastPosition": { "lat": 16.71, "lng": 81.09, "updatedAt": "..." },
  "studentCount": 25,
  "startedAt": "2024-01-15T08:00:00Z"
}]
```

Student counts are computed using a MongoDB aggregation pipeline (`$match` + `$group`) on `StudentAssignment`.

### Trip Analytics (`GET /api/admin/analytics?days=7`)

```json
{
  "period": "7 days",
  "totalTrips": 42,
  "averageDurationMinutes": 35.5,
  "totalStopsReached": 280,
  "todayEvents": 15,
  "busStats": [{
    "busId": "...",
    "busName": "Bus A",
    "tripCount": 7,
    "avgDuration": 34.2,
    "totalStopsReached": 45
  }]
}
```

### CSV Export (`GET /api/admin/export-trips`)

Downloads a CSV file with trip history. Supports:
- **Filter by days**: `?days=30` (default: all)
- **Filter by bus**: `?busId=...`
- **Auth via query param**: `?token=JWT` for direct browser download

CSV columns: Trip ID, Bus, Driver, Route, Status, Started, Ended, Duration, Stops Reached.

---

## 16. Map Components

### Technology

All maps use **Leaflet** (open-source map library) via **react-leaflet** (React bindings).

| Component | Used By | Features |
|-----------|---------|----------|
| **AdminMap** | Admin Dashboard | Shows all active buses on fleet map, SOS markers with pulse animation, auto-fit viewport |
| **DriverMap** | Driver Dashboard | Shows driver position, route polyline, stop markers, auto-pan to follow driver |
| **StudentMap** | Student Dashboard | Shows bus position (animated smooth movement), student's stop marker, auto-zoom to fit both |
| **MapEditor** | Manage Routes | Interactive route drawing (leaflet.pm plugin), stop placement, drag-and-drop reordering |
| **MapView** | General purpose | Base map wrapper with tile layer |

### Map Configuration

```javascript
ELURU_CENTER = { lat: 16.7107, lng: 81.0952 }  // Default map center
DEFAULT_MAP_ZOOM = 10
TILE_LAYER = OpenStreetMap ('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
```

### MapEditor Features

The route editor is the most complex frontend component (577 lines):

1. **Drawing**: Admin draws a polyline on the map → stored as GeoJSON
2. **Stop placement**: Click on map to place stops → modal to name each stop
3. **Reordering**: Drag-and-drop stop list (via @dnd-kit) to change stop sequence
4. **Route loading**: Existing routes load with polyline + stops pre-populated
5. **Conversion**: Drawn lines converted to GeoJSON via `lineToGeoJSON()`, markers to stop objects via `markerToStop()`

### Animated Bus Marker (StudentMap)

The `AnimatedMarker` component smoothly animates bus position changes instead of jumping:

```javascript
// Uses Leaflet's setLatLng for smooth CSS transition
markerRef.current.setLatLng([lat, lng]);
```

---

## 17. PWA (Progressive Web App)

### Service Worker (`public/sw.js`)

The service worker handles:

1. **Caching**: Caches static assets on install for offline support
2. **Push Notifications**: Listens for `push` events from the Web Push service and displays OS-level notifications

```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/markers/bus-icon.png',
    tag: data.tag,
    requireInteraction: data.requireInteraction
  });
});
```

### Web App Manifest (`public/manifest.json`)

Defines PWA install properties:
- App name, theme color, display mode (`standalone`)
- Start URL, icons, categories

### Registration

Service worker is registered in `main.jsx` on app load:

```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

---

## 18. Security Implementation

### Input Sanitization

The `sanitizeInput` middleware recursively scans `req.body` for keys starting with `$` to prevent NoSQL injection attacks:

```javascript
function hasDollarKeys(obj) {
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$')) return true;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (hasDollarKeys(obj[key])) return true;
    }
  }
  return false;
}
```

### Rate Limiting

```javascript
// Login: 10 attempts per 15 minutes per IP
rateLimit({ windowMs: 15 * 60 * 1000, max: 10 })

// Registration: 5 per hour per IP
rateLimit({ windowMs: 60 * 60 * 1000, max: 5 })

// CSV Export: 5 per 15 minutes
rateLimit({ windowMs: 15 * 60 * 1000, max: 5 })
```

### Password Security

- Passwords are **never stored in plain text** — always bcrypt with 10 salt rounds
- Legacy plain-text passwords are **auto-migrated** to bcrypt on login
- `firstLogin` flag forces password change before using any feature
- Profile password change requires **current password verification**

### JWT Security

- Tokens expire after 12 hours
- Stored in `localStorage` (not cookies — avoids CSRF)
- Auto-redirect to login on 401 response (token expiry)
- Server-side verification on every protected request

### CORS

```javascript
// Production: whitelist specific origins
origin: process.env.ALLOWED_ORIGINS.split(',')

// Development: permissive
origin: true
```

### Push Subscription Validation

```javascript
// Reject invalid push endpoints
if (endpoint.includes('permanently-removed.invalid')) → reject
if (!endpoint.startsWith('https://')) → reject
```

---

## 19. Configuration & Constants

### Backend Constants (`config/constants.js`)

| Constant | Value | Description |
|----------|-------|-------------|
| `RADIUS_METERS` | 75 | Stop arrival detection radius |
| `SUSTAIN_TIME_MS` | 3000 | Dwell time to confirm arrival (ms) |
| `LEAVE_RADIUS_METERS` | 80 | Stop departure detection radius |
| `MIN_UPDATE_INTERVAL_MS` | 1000 | GPS throttle interval (ms) |
| `ETA_ALPHA` | 0.25 | ETA exponential smoothing factor |
| `SEG_ALPHA` | 0.15 | Segment stats smoothing factor |
| `MIN_SPEED_MPS` | 0.8 | Min speed threshold (m/s) |
| `ASSUMED_SPEED_MPS` | 5 | Default speed when stopped (~18 km/h) |
| `DEFAULT_SEG_SEC` | 120 | Default segment travel time (2 min) |
| `ETA_EMIT_DELTA_MS` | 5000 | Min ETA change to trigger emit (ms) |
| `STALE_TRIP_HOURS` | 12 | Auto-end trip threshold |
| `OSRM_CACHE_TTL_MS` | 15000 | OSRM response cache duration (15s) |

### Environment Variables

#### Backend (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | — | Server port (default: 5000) |
| `NODE_ENV` | — | `development` or `production` |
| `MONGO_URI` | ✅ | MongoDB connection string |
| `DB_NAME` | ✅ | Database name |
| `JWT_SECRET` | ✅ (prod) | JWT signing secret |
| `ALLOWED_ORIGINS` | — | Comma-separated allowed CORS origins |
| `OSRM_BASE_URL` | — | OSRM server URL |
| `EMAIL_USER` | — | Gmail address for sending emails |
| `EMAIL_PASSWORD` | — | Gmail app password |
| `VAPID_PUBLIC_KEY` | — | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | — | Web Push VAPID private key |
| `VAPID_EMAIL` | — | VAPID contact email |
| `STALE_TRIP_HOURS` | — | Auto-end trips older than X hours |

#### Frontend (`.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_BACKEND_URL` | — | Backend URL (empty = auto-detect) |
| `VITE_MIN_UPDATE_INTERVAL_MS` | — | Min GPS update interval (default: 1000) |
| `VITE_VAPID_PUBLIC_KEY` | — | Web Push VAPID public key |

### API URL Auto-Detection

The frontend dynamically detects the correct backend URL:

```
1. If VITE_BACKEND_URL is set → use it
2. If accessing via localhost → use http://localhost:5000
3. If accessing via LAN IP (192.168.x.x) → use http://{same_hostname}:5000
4. Otherwise → use deployed URL (https://trackmate-backend.onrender.com)
```

This allows seamless development on localhost, testing on mobile via LAN, and production deployment — without changing any configuration.

---

## 20. Outcomes & Results

### What the System Achieves

| Feature | Outcome |
|---------|---------|
| **Real-time tracking** | Students see live bus position with < 1 second latency |
| **Automatic stop detection** | System auto-detects arrival/departure with 75m accuracy and 3s confirmation |
| **ETA accuracy** | Multi-source ETAs (OSRM + distance + historical) with exponential smoothing reduce prediction error |
| **Self-learning** | Segment travel times improve with each trip via EMA (alpha = 0.15) |
| **Push notifications** | Students receive alerts when bus is approaching — configurable thresholds |
| **Fleet management** | Admin has complete visibility: live positions, analytics, trip history, CSV export |
| **Zero-config mobile** | Auto-detects LAN IP for mobile testing without configuration changes |
| **Offline resilience** | Socket.IO offline buffer queues GPS updates during connectivity gaps |
| **Security** | bcrypt passwords, JWT auth, rate limiting, NoSQL injection protection, HTTPS push validation |

### Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Socket.IO over REST polling** | Real-time updates with < 1s latency, bidirectional communication, room-based broadcasting |
| **In-memory trip cache** | Avoids DB reads on every GPS update (potentially 1/second), sub-ms geofence checks |
| **OSRM + fallbacks** | Road routing is most accurate but can fail — segment stats and distance/speed ensure continuity |
| **Geofence with sustained dwell** | 3-second dwell requirement prevents false arrivals from traffic stops near but not at the bus stop |
| **EMA smoothing** | Prevents ETA "jitter" from noisy GPS data, provides stable estimates |
| **MongoDB with Mongoose** | Flexible schema for evolving data model, embedded arrays for stops (fast reads), references for relationships |
| **PWA over native app** | Cross-platform (Android + iOS), no app store deployment, instant updates, works offline |
| **Role-based single User model** | Simpler auth logic, unified login endpoint, role-based access via middleware |

### Application Metrics

- **7** Mongoose models
- **56** REST API endpoints
- **7** Socket.IO client → server events
- **12+** Socket.IO server → client events
- **12** controller files
- **3** middleware layers
- **6** utility modules
- **14** React page components
- **14** reusable React components
- **3** custom hooks
- **2** React context providers

---

*This documentation covers the complete TrackMate system architecture, implementation details, and technical decisions. For setup instructions, see [README.md](README.md).*
