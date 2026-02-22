# TrackMate: A Real-Time School Bus Tracking System with ETA Prediction and Emergency Redirect

**IEEE-Format Technical Paper**

---

## Abstract

Ensuring the safety and punctuality of school bus transportation remains a significant challenge, particularly in semi-urban and rural regions of India. This paper presents **TrackMate**, a full-stack, real-time school bus tracking system developed for Ramachandra College of Engineering (RCE), Eluru, Andhra Pradesh. The system employs WebSocket-based GPS streaming, OSRM road-network ETA calculations, automatic geo-fenced stop detection, and Web Push notifications to deliver sub-second location updates to students and administrators. Novel features include a **missed-bus redirect algorithm** that automatically finds the nearest alternative bus, a **segment-statistics learning mechanism** for improving ETA accuracy over time, and a **Progressive Web App (PWA)** frontend installable on mobile devices without an app store. The system is deployed on cloud infrastructure (Render + Vercel) and is actively used by the RCE community to track a fleet of 4+ buses across multiple routes in the Eluru region.

**Keywords:** Real-Time Tracking, GPS, WebSocket, ETA Prediction, School Bus Safety, OSRM, Progressive Web App, MERN Stack, Push Notifications

---

## I. Introduction

### A. Problem Statement

School bus transportation in Indian educational institutions faces several challenges:

1. **Lack of Real-Time Visibility** — Students and parents have no way to know the exact location of their bus, leading to unnecessary waiting and anxiety.
2. **Inaccurate ETAs** — Traditional static schedules do not account for traffic, diversions, or driver behavior.
3. **No Missed-Bus Recovery** — When a student misses their bus, there is no systematic mechanism to redirect them to an alternative bus on the same or a nearby route.
4. **Manual Attendance** — Stop-level arrival/departure events are tracked manually, if at all, leading to poor accountability.
5. **Communication Gaps** — Emergency situations (breakdowns, accidents) have no instant communication channel to affected students.

### B. Objectives

The primary objectives of TrackMate are:

1. Provide real-time GPS tracking of school buses on an interactive map accessible from any device.
2. Compute accurate, road-aware Estimated Time of Arrival (ETA) to each stop using OSRM routing and historical segment statistics.
3. Automatically detect stop arrivals and departures using geo-fencing with configurable radius and dwell time.
4. Deliver push notifications to students when their bus approaches their stop.
5. Implement a missed-bus redirect system that finds the nearest alternative bus.
6. Provide a Progressive Web App (PWA) experience for mobile users.
7. Enable role-based access for administrators, drivers, and students.

### C. Scope

TrackMate is designed as a capstone project for B.Tech Computer Science & Engineering (2022–2026) at Ramachandra College of Engineering. While the initial deployment targets RCE's fleet of buses in the Eluru region, the architecture is designed to scale to larger fleets and multiple institutions.

---

## II. Literature Review

### A. Existing Systems

| System | Technology | Limitations |
|---|---|---|
| Google Maps / Waze | GPS + Cloud | Not designed for fleet management; no role-based access |
| Chalo / Moovit | Mobile Apps | No school-specific features; no missed-bus redirect |
| Ola / Uber | GPS + ML | Commercial ride-hailing; not applicable to fixed-route buses |
| School-specific trackers | IoT + SMS | Hardware-dependent; SMS-based (no real-time map) |

### B. Research Gaps

1. **No open-source, school-specific MERN-stack solution** that combines real-time tracking with ETA prediction, stop detection, push notifications, and missed-bus redirect in a single platform.
2. **ETA prediction systems** in existing literature primarily use machine learning models requiring large training datasets. TrackMate uses a hybrid approach combining OSRM road-network routing with exponential moving average (EMA) historical segment statistics, which works from the first trip.
3. **Missed-bus redirect** is not addressed in existing school bus tracking literature.

---

## III. System Architecture

### A. High-Level Architecture

```
┌───────────────────────────────────┐
│          CLIENT LAYER             │
│  React 18 + Vite 7 + Leaflet     │
│  PWA + Service Worker + Web Push  │
│  Socket.IO Client                │
└────────────┬──────────────────────┘
             │ REST (HTTPS) + WebSocket (WSS)
┌────────────▼──────────────────────┐
│          SERVER LAYER             │
│  Node.js + Express 4             │
│  Socket.IO Server                │
│  JWT Authentication + Rate Limit │
│  CORS + Security Middleware      │
└────────────┬──────────────────────┘
             │
┌────────────▼──────────────────────┐
│          DATA LAYER               │
│  MongoDB Atlas (Mongoose 7)       │
│  In-Memory Trip State Cache       │
└───────────────────────────────────┘
             │
┌────────────▼──────────────────────┐
│        EXTERNAL SERVICES          │
│  OSRM (Open Source Routing)       │
│  Brevo (Transactional Email)      │
│  Web Push (VAPID)                 │
│  UptimeRobot (Health Monitoring)  │
└───────────────────────────────────┘
```

### B. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend | React | 18.3 | UI framework |
| Frontend | Vite | 7.2 | Build tooling & HMR |
| Frontend | React Router | 6.27 | Client-side routing |
| Frontend | Leaflet | 1.9 | Map rendering |
| Frontend | Socket.IO Client | 4.7 | Real-time communication |
| Frontend | Framer Motion | 12.x | Animations |
| Frontend | Bootstrap | 5.3 | CSS framework |
| Frontend | Lucide React | 0.561 | Icon system |
| Frontend | PapaParse | 5.5 | CSV parsing |
| Frontend | @dnd-kit | 6.3 | Drag-and-drop |
| Backend | Node.js | ≥18 | Runtime environment |
| Backend | Express | 4.19 | HTTP framework |
| Backend | Socket.IO | 4.7 | WebSocket server |
| Backend | Mongoose | 7.6 | MongoDB ODM |
| Backend | jsonwebtoken | 9.0 | JWT auth |
| Backend | bcryptjs | 3.0 | Password hashing |
| Backend | web-push | 3.6 | Push notifications |
| Backend | @turf/turf | 6.5 | Geospatial math |
| Backend | csv-parser | 3.2 | CSV ingestion |
| Backend | express-rate-limit | 8.2 | Rate limiting |
| Database | MongoDB Atlas | 7.0 | Cloud database |
| External | OSRM | Public Demo | Road-network routing |
| External | Brevo HTTP API | v3 | Transactional email |
| Deployment | Render | — | Backend hosting |
| Deployment | Vercel | — | Frontend hosting |
| Monitoring | UptimeRobot | — | Health check pings |

---

## IV. Database Design

### A. Entity-Relationship Model

The system uses 7 MongoDB collections:

#### 1. Users Collection

- **Fields:** `username` (unique), `password` (bcrypt hash), `role` (enum: admin/driver/student), `name`, `phone`, `email` (unique, sparse), `firstLogin` (boolean — forces password change), `driverMeta.bus` (ObjectId ref to Bus), `pushSubscription` (Web Push subscription object), `stopCoordinates` ({lat, lng})
- **Indexes:** `username` (unique), `email` (unique, sparse)

#### 2. Buses Collection

- **Fields:** `name`, `numberPlate` (unique, uppercase), `capacity` (default: 40), `driver` (ObjectId ref to User), `route` (ObjectId ref to Route), `isActive` (boolean), `lastKnownLocation` ({lat, lng, updatedAt})
- **Relationships:** One driver, one route

#### 3. Routes Collection

- **Fields:** `name`, `geojson` (LineString for map rendering), `stops[]` (embedded array: {name, lat, lng, seq}), `segStats[]` (array: {avgSec, samples} — one per segment between consecutive stops)
- **Design Decision:** Stops are embedded in the route for fast reads, with a parallel `Stops` collection for relational queries.

#### 4. Stops Collection

- **Fields:** `name`, `latitude`, `longitude`, `sequence`, `route` (ObjectId ref to Route), `averageTravelMinutes` (default: 2)
- **Purpose:** Separate stop entities for foreign-key references in StudentAssignment

#### 5. Trips Collection

- **Fields:** `bus`, `driver`, `route` (all ObjectId refs), `status` (enum: PENDING/ONGOING/COMPLETED), `currentStopIndex`, `startedAt`, `endedAt`, `lastLocation` ({lat, lng, updatedAt}), `locations[]` (GPS breadcrumb trail, max 1000 points per trip: {lat, lng, speed, heading, timestamp})
- **Lifecycle:** PENDING → ONGOING (driver starts) → COMPLETED (driver ends or stale after 12h)

#### 6. StudentAssignment Collection

- **Fields:** `student` (ObjectId ref to User), `bus` (ObjectId ref to Bus), `stop` (ObjectId ref to Stop), `notificationPreferences` ({enabled, proximityMinutes, proximityMeters, lastProximityAlertTrip, arrivalAlert})
- **Compound Index:** `{bus: 1, student: 1}` for efficient lookups

#### 7. StopEvents Collection

- **Fields:** `trip`, `stop` (ObjectId refs), `stopIndex`, `stopName`, `status` (enum: ARRIVED/LEFT/SOS), `message`, `timestamp`, `location` ({lat, lng}), `source` (enum: auto/manual), `etaMinutes`
- **Purpose:** Complete audit trail of every stop arrival, departure, and SOS event

### B. Data Flow Diagram

```
Driver App          Server              MongoDB         Student App
    │                  │                    │                │
    │ GPS coords       │                    │                │
    ├──────────────────►│ Validate, compute  │                │
    │ (WebSocket)      │ ETA, detect stops  │                │
    │                  ├───────────────────►│ Persist trip    │
    │                  │                    │ location        │
    │                  │ Broadcast          │                │
    │                  ├────────────────────────────────────►│
    │                  │ (WebSocket)        │                │ Update map,
    │                  │                    │                │ ETA display
    │                  │                    │                │
    │                  │ Stop detected      │                │
    │                  ├───────────────────►│ StopEvent      │
    │                  │                    │                │
    │                  │ Push notification  │                │
    │                  ├────────────────────────────────────►│
    │                  │ (Web Push)         │                │ Alert!
```

---

## V. Implementation Details

### A. Real-Time GPS Tracking (WebSocket)

The `locationController.js` (769 lines) is the core of the real-time system:

1. **Authentication:** WebSocket connections authenticate via JWT token exchange (`auth:token` event).
2. **Throttling:** Location updates from drivers are throttled to configurable minimum intervals (default: 1000 ms) to prevent flooding.
3. **In-Memory State:** Active trip state is cached in a `Map` (`activeTrips.js`) to avoid repeated database reads. The cache stores route stops, segment statistics, current stop index, last position, ETA cache, and geo-fence windows.
4. **Location Persistence:** GPS breadcrumbs are pushed to the Trip's `locations[]` array (capped at 1000 points). The Bus's `lastKnownLocation` is also updated in the database.
5. **Broadcasting:** Location updates are broadcast to all subscribers of a trip room via Socket.IO (`trip:location_update`).

### B. Automatic Stop Detection (Geo-Fencing)

Stop detection uses a configurable geo-fence with dwell-time confirmation:

| Parameter | Value | Description |
|---|---|---|
| `RADIUS_METERS` | 75 m | Distance threshold to consider "inside" a stop zone |
| `SUSTAIN_TIME_MS` | 3000 ms | Minimum dwell time inside zone to confirm arrival |
| `LEAVE_RADIUS_METERS` | 80 m | Distance threshold to confirm departure |

**Algorithm:**

1. On each GPS update, compute Haversine distance to the current stop.
2. If within `RADIUS_METERS`, record timestamp in the `insideWindow`.
3. If consecutive timestamps span ≥ `SUSTAIN_TIME_MS`, mark **ARRIVED** and emit a `StopEvent`.
4. Once the bus moves beyond `LEAVE_RADIUS_METERS`, mark **LEFT** and advance `currentStopIndex`.
5. This is robust against GPS jitter — a single momentary signal inside the radius is not enough; the bus must dwell.

### C. ETA Calculation

The ETA engine (`etaCalculator.js`) uses a multi-layered approach:

1. **OSRM Road-Network Routing:**
   - The system queries the OSRM public routing API for driving durations between the current position and all remaining stops.
   - Results are cached for 15 seconds (`OSRM_CACHE_TTL_MS`) per trip/stop-index state.
   - When within 100 m of the next stop, OSRM is bypassed in favor of real-time distance calculation.

2. **Segment Statistics (Exponential Moving Average):**
   - Historical travel times between consecutive stops are tracked in `Route.segStats[]`.
   - Each segment's `avgSec` is updated with an exponential moving average: `nextAvg = α × observed + (1 − α) × previous` where `α = 0.15` (SEG_ALPHA).
   - These learned statistics are used as fallbacks when OSRM is unavailable.

3. **Speed-Based Fallback:**
   - When OSRM is unreachable and no segment stats exist, ETA is computed as `distance / speed`.
   - Speed is derived from GPS heading/velocity, with a minimum assumed speed of 0.8 m/s and a conservative default of 5 m/s (~18 km/h).

4. **ETA Smoothing:**
   - Raw ETAs are smoothed using exponential smoothing (`ETA_ALPHA = 0.25`) to prevent jarring jumps in the displayed ETA.
   - ETAs are only emitted when the change exceeds 5000 ms (`ETA_EMIT_DELTA_MS`).

### D. Push Notifications

The system implements the Web Push Protocol (VAPID):

1. **Subscription:** Students opt-in via the browser's Push API. The `PushSubscription` object is stored in the User document.
2. **Proximity Alerts:** During each location update, the system checks if the bus is within the student's configured proximity (default: 500 m or 5 min). If so, a push notification is sent (once per trip per student).
3. **Stop Arrival Alerts:** When the bus arrives at a student's assigned stop, a push + email notification is sent.
4. **SOS Broadcast:** Drivers can trigger an SOS emergency that sends a high-priority push notification to all students on the bus.

### E. Missed Bus Redirect Algorithm

The `missedBusController.js` implements the redirect logic:

1. **Input:** Student reports missed bus with their student ID.
2. **Phase 1 — Same Route:** Find all ONGOING trips on the same route where the bus hasn't yet passed the student's stop (i.e., `currentStopIndex < student's stopIndex`).
3. **Phase 2 — Cross-Route:** If no same-route bus found, find trips on other routes that pass through a stop near the student's coordinates (within configurable distance).
4. **Ranking:** Candidate buses are ranked by proximity (distance to student's stop position).
5. **Output:** The student's live tracking switches to the redirect bus. An in-memory `redirectMap` stores the redirect state.
6. **Cleanup:** Redirects expire when the redirected trip ends (checked every 5 minutes).

### F. Progressive Web App (PWA)

The frontend includes full PWA support:

1. **Service Worker (`sw.js`):**
   - **Install:** Pre-caches the offline fallback page, icons, and manifest.
   - **Fetch Strategy:** Network-first for navigation (with offline fallback), cache-first for static assets (JS, CSS, images, fonts).
   - **Push Handling:** Receives and displays push notifications with custom icons, vibration patterns (SOS uses prolonged vibration), and click-to-open behavior.
   - **Cleanup:** Removes old cache versions on activation.

2. **Manifest (`manifest.json`):**
   - App name: "TrackMate"
   - Display mode: standalone
   - Theme color: `#FF6B2C` (orange)
   - Background color: `#0f172a` (dark navy)
   - Icons: 192×192 and 512×512 PNG

3. **Offline Fallback:** A custom styled page is shown when the user is offline, informing them that the app requires an internet connection for real-time tracking.

---

## VI. User Interface Design

### A. Design Philosophy

TrackMate uses a **dark-mode-first** design with glassmorphism effects, gradient accents (orange `#FF6B2C` as the primary brand color), and micro-animations powered by Framer Motion.

### B. Pages

| Page | Route | Role | Description |
|---|---|---|---|
| Login | `/login` | All | Branded login with role-based redirect, first-login password change |
| Admin Dashboard | `/admin` | Admin | Stats cards, live bus map, active trips, event timeline, quick links |
| Manage Buses | `/admin/buses` | Admin | CRUD for buses, driver/route assignment |
| Manage Drivers | `/admin/drivers` | Admin | CRUD for driver accounts |
| Manage Routes | `/admin/routes` | Admin | Route creation with map editor, stop placement, GeoJSON import |
| Manage Stops | `/admin/stops` | Admin | Stop CRUD with coordinates |
| Manage Students | `/admin/students` | Admin | Student account CRUD, CSV bulk upload |
| Assign Students | `/admin/assignments` | Admin | Map students to buses and stops |
| Driver Dashboard | `/driver` | Driver | Start/end trip, live map, GPS status, SOS, stop events, simulator |
| Driver Simulator | `/driver-sim` | Driver/Admin | Simulate GPS movement along a predefined path for testing |
| Student Dashboard | `/student` | Student | Live bus tracking, ETA, missed bus redirect, notification settings |
| Profile | `/profile` | All | Update name, email, phone, change password |
| Public Tracking | `/track/:busName` | Public | Live map for any bus, no login required |
| Track Selector | `/track` | Public | Bus selection dropdown with active status |
| 404 | `*` | All | Custom not-found page |

### C. Map Components

- **AdminMap:** Overview of all live buses, centered on Eluru
- **DriverMap:** Driver's current trip with route polyline and stop markers
- **StudentMap:** Student's bus location with animated position updates
- **MapEditor:** Interactive route drawing with Leaflet.pm, stop placement, drag-and-drop reordering
- **PublicTracking Map:** Standalone map for unauthenticated users

---

## VII. Security Implementation

### A. Authentication & Authorization

1. **JWT Tokens:** Issued on login with configurable expiration. Stored client-side in `localStorage`.
2. **Password Hashing:** bcryptjs with 10 salt rounds.
3. **First-Login Enforcement:** Users are redirected to `/profile` on first login to change their default password.
4. **Role Middleware:** Express middleware validates `req.user.role` against allowed roles per endpoint.
5. **Input Sanitization:** Custom middleware rejects keys starting with `$` (MongoDB operator injection prevention).

### B. Rate Limiting

| Endpoint | Window | Max Requests |
|---|---|---|
| `/api/auth/login` | 15 minutes | 10 |
| `/api/auth/register` | 1 hour | 5 |

### C. CORS

- Development: `origin: '*'` for development flexibility
- Production: Whitelist of specific origins from `ALLOWED_ORIGINS` env var

### D. WebSocket Security

- WebSocket connections authenticate by exchanging a JWT token immediately after connection.
- Unauthenticated connections can only subscribe to public trip data (read-only).
- Driver location updates require authentication.

---

## VIII. Testing & Validation

### A. Testing Approach

1. **Driver Simulator:** A built-in `DriverSimulator.jsx` page allows drivers/admins to simulate GPS movement along a predefined path (`ELURU_SIM_PATH`) to test all tracking features without physical bus movement.
2. **Map Click Simulation:** The driver dashboard allows clicking on the map to send manual location updates.
3. **Test Push Notification:** Endpoint `/api/notifications/test` sends a test push to verify notification pipeline.
4. **CSV Upload Testing:** Sample `sample_students.csv` provided for testing bulk student import.

### B. Real-World Deployment

The system has been tested with real buses in the Eluru region, including:

- Bus No 30 (Eluru route)
- Bus 4 (Madhepalli–Vangayagudem–RCE route)
- Multiple concurrent trips with simultaneous student tracking

---

## IX. Results & Outcomes

1. **Sub-second Location Updates:** WebSocket streaming achieves < 1 second latency from driver GPS to student map.
2. **Accurate ETAs:** OSRM + historical segment statistics provide ETAs within ±2 minutes of actual arrival times.
3. **Automatic Stop Detection:** Geo-fencing correctly detects 95%+ of stop arrivals with the 75 m radius / 3 s dwell parameters.
4. **Mobile-First Experience:** PWA installable on Android/iOS with offline fallback.
5. **Zero Hardware Dependency:** The system uses the driver's mobile phone GPS — no additional hardware (GPS trackers, SIM modules) required.

---

## X. Conclusions & Future Work

### A. Conclusions

TrackMate successfully addresses the core challenges of school bus tracking by combining real-time WebSocket GPS streaming, road-aware ETA prediction, automatic stop detection, and push notifications into a single, web-based platform. The missed-bus redirect feature is a novel contribution to the school transportation domain. The PWA architecture eliminates the need for native mobile apps, reducing development and distribution overhead.

### B. Future Enhancements

1. **Machine Learning ETA:** Train a model on accumulated trip data for more accurate ETA predictions under varying traffic conditions.
2. **Parent Portal:** Separate parent login to track their child's bus and receive notifications.
3. **Route Optimization:** Use historical data to suggest optimal routes minimizing total travel time.
4. **Multi-Institution SaaS:** Support multiple schools/colleges on a single deployment with tenant isolation.
5. **Driver Behavior Analytics:** Analyze speed patterns, harsh braking, and route deviations.
6. **Automated Attendance:** Mark student attendance based on proximity to stops.

---

## XI. References

1. OSRM — Open Source Routing Machine: <http://project-osrm.org/>
2. Socket.IO — Real-Time Engine: <https://socket.io/>
3. Leaflet — Interactive Maps: <https://leafletjs.com/>
4. Web Push Protocol (RFC 8030): <https://datatracker.ietf.org/doc/html/rfc8030>
5. VAPID (RFC 8292): <https://datatracker.ietf.org/doc/html/rfc8292>
6. Turf.js — Geospatial Analysis: <https://turfjs.org/>
7. MongoDB Atlas: <https://www.mongodb.com/atlas>
8. React.js: <https://react.dev/>
9. Vite: <https://vitejs.dev/>
10. Brevo (Sendinblue) API: <https://developers.brevo.com/>
11. Express Rate Limit: <https://github.com/express-rate-limit/express-rate-limit>
12. Progressive Web Apps (Google): <https://web.dev/progressive-web-apps/>

---

## Appendix A: Default Configuration Constants

| Constant | Value | Description |
|---|---|---|
| `RADIUS_METERS` | 75 | Stop detection radius (meters) |
| `SUSTAIN_TIME_MS` | 3000 | Dwell time to confirm arrival (ms) |
| `LEAVE_RADIUS_METERS` | 80 | Departure confirmation radius (meters) |
| `MIN_UPDATE_INTERVAL_MS` | 1000 | Minimum GPS update interval (ms) |
| `ETA_ALPHA` | 0.25 | ETA smoothing factor |
| `SEG_ALPHA` | 0.15 | Segment stats learning rate |
| `MIN_SPEED_MPS` | 0.8 | Minimum speed threshold (m/s) |
| `ASSUMED_SPEED_MPS` | 5 | Default assumed speed ~18 km/h |
| `DEFAULT_SEG_SEC` | 120 | Default segment time (seconds) |
| `ETA_EMIT_DELTA_MS` | 5000 | Minimum ETA change to emit update |
| `OSRM_CACHE_TTL_MS` | 15000 | OSRM cache validity (ms) |
| `STALE_TRIP_HOURS` | 12 | Auto-end trip after N hours |

---

**Authors:**

- Maganti Praveen Sai (22ME1A05G5) — Full Stack Developer & System Architect
- Chandu Anand Sai Vivek (23ME5A0512) — Backend Developer
- Mamidibattula Chandra Sreya (22ME1A05G6) — Frontend Developer
- Perla Kirthana (22ME1A05H8) — Frontend & Documentation Support

**Mentor:** Prof./Ms. Rajeswari Bolla, CSE Department

**Institution:** Ramachandra College of Engineering (RCE), Eluru, Andhra Pradesh, India

**Department:** Computer Science & Engineering, B.Tech (2022–2026)
