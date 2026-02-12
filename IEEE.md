# TrackMate: A Real-Time College Bus Tracking System Using Progressive Web Application Technology

---

## I. ABSTRACT

This paper presents **TrackMate**, a real-time college bus tracking system built as a Progressive Web Application (PWA) that enables live GPS tracking, automated stop detection, and intelligent ETA computation for college transportation. The system addresses the persistent challenge faced by students regarding bus arrival uncertainty by providing three role-based dashboards — Admin, Driver, and Student — connected through WebSocket communication for sub-second live position updates. TrackMate employs a multi-layered ETA calculation strategy combining OSRM road routing, geospatial distance computation, and self-learning segment travel times refined through Exponential Moving Average (EMA) smoothing. The geofence-based automatic stop detection system uses sustained dwell-time analysis to reliably identify bus arrivals and departures, while Web Push notifications deliver proximity and arrival alerts to students. Deployed as a cross-platform PWA, the system eliminates the need for native app installation while providing offline resilience and installable experiences. Experimental results demonstrate sub-second tracking latency, 75-meter geofence accuracy with 3-second confirmation, and progressively improving ETA predictions through historical travel time learning.

**Keywords** — Real-time bus tracking, Progressive Web Application, WebSocket, GPS, Geofencing, ETA calculation, Push notifications, Socket.IO, OSRM routing, Exponential Moving Average.

---

## II. INTRODUCTION

### A. Background

College transportation systems serve thousands of students daily, yet most institutions lack real-time visibility into bus operations. Students often wait at designated stops without knowing whether their bus is delayed, has already passed, or is still en route. This uncertainty leads to extended wait times, missed buses, and overall dissatisfaction with campus transportation services.

Existing solutions for public transit tracking — such as Google Maps Transit or Moovit — rely on scheduled timetable data and are not designed for private college bus fleets that operate on dynamic schedules without GTFS (General Transit Feed Specification) data feeds. Native mobile applications, while feature-rich, introduce barriers including platform-specific development, app store deployment cycles, and mandatory installation requirements.

### B. Problem Statement

College students face significant uncertainty about bus arrival times, leading to:

- Extended wait times at bus stops
- Missed buses due to early departures or route deviations
- No mechanism for real-time communication between drivers and students
- Lack of fleet visibility for administrators to monitor operations

### C. Proposed Solution

TrackMate addresses these challenges through a PWA-based system that provides:

- **Students**: Live GPS tracking of their assigned bus with real-time ETA to their designated stop
- **Drivers**: Simple trip management interface with automatic stop detection and GPS broadcasting
- **Administrators**: Comprehensive fleet oversight with analytics, route management, and live monitoring

### D. Contributions

The key contributions of this paper are:

1. A **multi-layered ETA calculation system** combining OSRM road routing, geospatial distance computation, and self-learning segment statistics
2. A **geofence-based stop detection algorithm** using sustained dwell-time analysis to prevent false positives
3. An **in-memory trip state cache** architecture that enables real-time processing of GPS updates without database bottlenecks
4. A **PWA-based approach** to campus transit tracking that eliminates native app deployment barriers

---

## III. LITERATURE REVIEW

### A. Existing Bus Tracking Systems

| System | Approach | Limitations |
|--------|----------|-------------|
| Google Maps Transit | GTFS schedule data | Requires transit agency GTFS feeds; not available for private college buses |
| Moovit | Crowdsourced + GTFS | Depends on public transit data; no support for private fleets |
| GPS-based tracking apps (native) | Hardware GPS + native mobile apps | High development cost (Android + iOS); requires app installation |
| SMS-based notification systems | Text messages on estimated times | No real-time tracking; relies on periodic manual updates |
| RFID-based attendance systems | RFID tags at stops | Only detects stop arrivals; no in-transit tracking |

### B. Technologies for Real-Time Communication

| Technology | Latency | Direction | Suitability |
|------------|---------|-----------|-------------|
| HTTP Polling | 1–30s | Client → Server | High latency, wasteful bandwidth |
| HTTP Long Polling | 0.5–5s | Server → Client | Better latency, but connection overhead |
| Server-Sent Events (SSE) | <1s | Server → Client only | Unidirectional; cannot send GPS from driver |
| **WebSocket (Socket.IO)** | **<100ms** | **Bidirectional** | **Optimal: low latency, bidirectional, room-based broadcasting** |

### C. ETA Calculation Approaches

| Method | Accuracy | Limitations |
|--------|----------|-------------|
| Fixed schedule | Low | Does not account for traffic or delays |
| Distance/speed | Medium | Assumes straight-line or constant speed |
| Road routing (OSRM) | High | Requires external API; may timeout |
| **Multi-source with EMA smoothing** | **Highest** | **Combines routing + distance + historical data with jitter reduction** |

---

## IV. SYSTEM ARCHITECTURE

### A. High-Level Architecture

TrackMate employs a three-tier client-server architecture with real-time communication:

```text
┌────────────────────────────────────────────────────┐
│           FRONTEND (React 18 + Vite 7 PWA)         │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  Admin   │  │  Driver  │  │ Student  │          │
│  │Dashboard │  │Dashboard │  │Dashboard │          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│       └──────────────┼─────────────┘               │
│              Axios (REST) + Socket.IO Client        │
└──────────────────────┼─────────────────────────────┘
                       │  HTTP + WebSocket
┌──────────────────────┼─────────────────────────────┐
│                      │  BACKEND (Node.js + Express) │
│  ┌───────────────────┴─────────────────────┐       │
│  │   Express REST API  +  Socket.IO Server │       │
│  └───────┬─────────────────────┬───────────┘       │
│          │                     │                    │
│  ┌───────┴───────┐  ┌─────────┴──────────┐        │
│  │  Controllers  │  │  Location Engine   │         │
│  │  (12 files)   │  │  (Real-time GPS)   │         │
│  └───────┬───────┘  └─────────┬──────────┘        │
│          └─────────────────────┘                    │
│                     │                               │
│  ┌──────────────────┴──────────────────┐           │
│  │    MongoDB Atlas (Mongoose ODM)     │           │
│  │    7 Models + In-Memory Trip Cache  │           │
│  └─────────────────────────────────────┘           │
│                                                     │
│  External: OSRM · Gmail SMTP · Web Push (VAPID)    │
└─────────────────────────────────────────────────────┘
```

### B. Data Flow

1. **Driver GPS → Backend**: Driver's browser sends GPS coordinates via Socket.IO every 1 second
2. **Backend Processing**: Location engine processes coordinates — updates database, detects stops via geofencing, computes ETAs
3. **Backend → Students**: Processed data emitted to subscribed students via Socket.IO room-based broadcasting
4. **REST API**: All CRUD operations (buses, routes, students, assignments) use standard HTTP REST endpoints
5. **Push Notifications**: Triggered server-side when proximity/arrival conditions are met

### C. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 18.3 | UI component library |
| | Vite | 7.2 | Build tool with HMR |
| | Leaflet / react-leaflet | 1.9 / 4.2 | Interactive map rendering |
| | Socket.IO Client | 4.7 | WebSocket communication |
| | Tailwind CSS | 3.4 | Utility-first styling |
| **Backend** | Node.js | 18+ | JavaScript runtime |
| | Express | 4.19 | REST API framework |
| | Socket.IO | 4.7 | WebSocket server |
| | Mongoose | 7.6 | MongoDB ODM |
| | @turf/turf | 6.5 | Geospatial computation |
| **Database** | MongoDB Atlas | — | Cloud NoSQL database |
| **External** | OSRM | — | Road routing engine |
| | Web Push (VAPID) | — | Browser push notifications |
| | Gmail SMTP | — | Email delivery |

---

## V. DATABASE DESIGN

The system uses MongoDB with 7 Mongoose schema models. The key design decision is a **single User collection** with role-based differentiation (admin, driver, student) and a **StudentAssignment** junction collection for bus-stop assignments.

### A. Entity-Relationship Overview

```text
User (admin|driver|student)
  │
  ├── 1:1 ── Bus (driver assignment via driverMeta.bus)
  │            │
  │            ├── N:1 ── Route
  │            │           │
  │            │           └── 1:N ── Stop (embedded + separate)
  │            │
  │            └── 1:N ── Trip
  │                        │
  │                        └── 1:N ── StopEvent
  │
  └── 1:1 ── StudentAssignment
              │
              ├── N:1 ── Bus
              └── N:1 ── Stop
```

### B. Model Specifications

| Model | Fields | Key Features |
|-------|--------|-------------|
| **User** | username, password, role, name, email, phone, firstLogin, driverMeta, pushSubscription | Single collection for all roles; bcrypt hashed passwords; sparse unique email index |
| **Bus** | name, numberPlate, capacity, driver, route, isActive, lastKnownLocation | GPS position persisted with timestamp; driver reference for assignment |
| **Route** | name, geojson, stops[], segStats[] | Embedded stops array for fast reads; segment statistics for ETA learning |
| **Stop** | name, latitude, longitude, sequence, route | Mirrors Route.stops; synced via `syncStopsForRoute()` |
| **Trip** | bus, driver, route, status, currentStopIndex, locations[] | GPS breadcrumb trail (max 1000 via $slice); stale detection after 12 hours |
| **StudentAssignment** | student, bus, stop, notificationPreferences | Compound index {bus, student}; per-trip proximity alert deduplication |
| **StopEvent** | trip, stop, stopIndex, stopName, status, source, timestamp | Records ARRIVED/LEFT/SOS events; source: 'auto' (geofence) or 'manual' (driver) |

---

## VI. METHODOLOGY

### A. Real-Time Location Tracking Engine

The core of TrackMate is the location processing engine (`locationController.js`), which handles incoming GPS updates at up to 1 Hz frequency.

#### Processing Pipeline

For each GPS coordinate received from a driver:

```text
Step 1: Throttle check (minimum 1000ms between updates)
Step 2: Get or rebuild in-memory trip state
Step 3: Persist to database (Bus.lastKnownLocation + Trip.lastLocation)
Step 4: Broadcast position to subscribed students via Socket.IO
Step 5: Execute geofence detection (look-ahead: next 5 stops)
Step 6: Update segment statistics on departure events
Step 7: Compute ETAs (OSRM → distance/speed → segment stats)
Step 8: Evaluate push notification conditions
```

#### In-Memory Trip State Cache

To avoid database reads on every GPS update (potentially 1 per second per bus), each active trip maintains an in-memory state object:

```text
{
  tripId, trip, route, routeStops,
  lastPosition: { lat, lng, timestamp },
  etaCache: { stopId → etaMs },
  insideWindow: { index, enteredAt },
  arrivalLog: Set<stopIndex>,
  currentStopIndex: number
}
```

A periodic cleanup (every 10 minutes) purges completed or stale trip entries from the cache.

### B. Geofence-Based Stop Detection Algorithm

The system automatically detects bus arrivals and departures using a dual-radius geofence with sustained dwell-time verification:

#### Algorithm 1: Geofence Stop Detection

```text
Input: busPosition (lat, lng), routeStops[], currentStopIndex
Constants: RADIUS_METERS = 75m, LEAVE_RADIUS = 80m, SUSTAIN_TIME = 3000ms

FOR each stop in routeStops[currentStopIndex ... currentStopIndex + 5]:
    distance ← haversine(busPosition, stop.position)

    IF distance ≤ RADIUS_METERS:
        IF NOT insideGeofence:
            SET insideWindow ← { stopIndex, enteredAt: now }
        ELSE IF (now - enteredAt) ≥ SUSTAIN_TIME:
            IF stop NOT in arrivalLog:
                GENERATE ARRIVED event
                ADD stop to arrivalLog
                EMIT trip:stop_arrived to subscribers
                SEND arrival push notifications

    ELSE IF distance > LEAVE_RADIUS:
        IF stop IN arrivalLog AND was previously ARRIVED:
            GENERATE LEFT event
            INCREMENT currentStopIndex
            UPDATE segment travel statistics
            EMIT trip:stop_left to subscribers
```

**Design Rationale:**

- **Dual-radius (75m arrival / 80m departure)**: The 5-meter hysteresis prevents oscillation when a bus is near the geofence boundary
- **3-second sustained dwell time**: Prevents false arrivals from buses passing through traffic near (but not at) a stop
- **5-stop look-ahead window**: Handles out-of-order stops and GPS inaccuracies

### C. Multi-Source ETA Calculation

TrackMate employs a three-layer ETA computation strategy with exponential smoothing:

#### Layer 1 — OSRM Road Routing (Primary)

```text
coordinates ← [busPosition, stop₁, stop₂, ..., stopₙ]
response ← OSRM.route(coordinates, overview=false)
etaMs[i] ← sum(response.legs[0..i].duration) × 1000
Cache result for 15 seconds
```

#### Layer 2 — Distance/Speed Fallback

When OSRM is unavailable or times out (1.5s):

```text
remainingDistance ← projectOnRoute(busPosition, routeGeoJSON) → distanceToStop
etaMs ← (remainingDistance / speedMps) × 1000
```

Uses `@turf/turf` for point-on-line projection, providing more accurate path-following distance than straight-line Haversine distance.

#### Layer 3 — Historical Segment Averages

```text
etaMs ← Σ segStats[i].avgSec × 1000  (for segments between current and target stop)
```

**Exponential Moving Average (EMA) Smoothing:**

```text
smoothedETA = α × rawETA + (1 - α) × previousSmoothedETA
where α = 0.25
```

This reduces ETA jitter caused by noisy GPS data while remaining responsive to genuine speed changes.

### D. Segment Statistics Self-Learning

After each bus departure from a stop, the system records the actual travel time and updates the segment's historical average using EMA:

```text
observedSeconds ← (departureTime - previousDepartureTime) / 1000
newAvg ← β × observedSeconds + (1 - β) × previousAvg
where β = 0.15 (segment learning rate)
```

This means the system **improves over multiple trips**, progressively providing more accurate ETAs as it learns the typical travel time for each road segment.

### E. Push Notification System

The system uses the **Web Push (VAPID)** protocol for browser-based notifications:

```text
Driver GPS Update
    │
    ├── Check each student's assignment on this bus
    │   ├── If bus within student's proximityMeters threshold
    │   │   OR bus within student's proximityMinutes threshold
    │   │   AND lastProximityAlertTrip ≠ currentTripId
    │   │       └── Send proximity push notification
    │   │           └── Set lastProximityAlertTrip = currentTripId (dedup)
    │   │
    │   ├── If ARRIVED event at student's stop
    │   │       └── Send arrival push notification
    │   │
    │   └── If SOS event
    │           └── Send emergency notification (requireInteraction: true)
```

**Deduplication**: Each student receives at most one proximity alert per trip via the `lastProximityAlertTrip` field.

---

## VII. IMPLEMENTATION

### A. Authentication and Authorization

| Mechanism | Implementation |
|-----------|---------------|
| **Password hashing** | bcrypt with 10 salt rounds |
| **Token-based auth** | JWT (HS256, 12-hour expiry) |
| **Role-based access** | Middleware chain: `authMiddleware → roleMiddleware(roles)` |
| **First-login enforcement** | `firstLogin` flag forces password change |
| **NoSQL injection prevention** | Recursive `$`-key detection in request bodies |
| **Rate limiting** | Login: 10/15min, Registration: 5/hour, CSV Export: 5/15min |
| **CORS** | Whitelist-based in production, permissive in development |

### B. Real-Time Communication (Socket.IO)

| Event | Direction | Purpose |
|-------|-----------|---------|
| `auth:token` | Client → Server | JWT socket authentication |
| `driver:location_update` | Client → Server | GPS position broadcast |
| `trip:location_update` | Server → Room | Live bus position to students |
| `trip:eta_update` | Server → Room | Updated ETAs for all stops |
| `trip:stop_arrived` | Server → Room | Bus arrived at stop |
| `trip:stop_left` | Server → Room | Bus departed from stop |
| `trip:sos` | Server → Room + Admin | Emergency SOS broadcast |
| `bus:trip_started` | Server → Broadcast | New trip notification |

**Room Structure**: `trip_{tripId}` for trip-specific updates, `admin_room` for admin notifications.

### C. Frontend Dashboards

| Dashboard | Key Features |
|-----------|-------------|
| **Admin** | Fleet overview map, real-time bus positions, dashboard statistics (bus/driver/student/trip counts), trip analytics with per-bus breakdowns, CSV export, CRUD management for all entities |
| **Driver** | Trip start/end controls, live GPS broadcasting, manual stop event buttons, route display with stop markers, simulation mode for testing, screen wake lock (via Wake Lock API) |
| **Student** | Live bus position on map with animated marker, real-time ETA display, journey progress bar, push notification preferences, stop event history timeline, auto-refresh (30s polling + socket events) |

### D. Progressive Web Application (PWA)

| Feature | Implementation |
|---------|---------------|
| **Installable** | Web App Manifest with standalone display mode |
| **Offline support** | Service Worker caches static assets |
| **Push notifications** | Service Worker handles push events for OS-level notifications |
| **Screen wake lock** | Wake Lock API prevents screen dimming during active trips |
| **Auto-detection** | Frontend auto-detects localhost, LAN IP, or production backend URL |

---

## VIII. REST API DESIGN

The backend exposes **56 REST API endpoints** organized across 10 route files:

| Module | Endpoints | Auth | Description |
|--------|-----------|------|-------------|
| `/api/auth` | 4 | Public/Auth | Login, register, profile, password management |
| `/api/admin` | 16 | Admin | Dashboard stats, analytics, CRUD management, CSV export |
| `/api/buses` | 4 | Admin | Bus fleet CRUD with driver metadata sync |
| `/api/routes` | 4 | Admin/Auth | Route CRUD with GeoJSON geometry and stop sync |
| `/api/stops` | 4 | Admin/Auth | Stop CRUD with parent route refresh |
| `/api/driver` | 7 | Driver | Trip management, GPS sharing, manual events |
| `/api/trips` | 5 | Driver | Trip lifecycle (start, active, end, history) |
| `/api/students` | 8 | Student | Assignment, ETA, trip data, notification preferences |
| `/api/events` | 2 | Admin | Stop event queries |
| `/api/notifications` | 2 | Auth | Push subscription management and testing |

---

## IX. RESULTS AND ANALYSIS

### A. Performance Metrics

| Metric | Measured Value |
|--------|---------------|
| **GPS update frequency** | 1 Hz (once per second) |
| **End-to-end tracking latency** | < 1 second (WebSocket) |
| **Geofence detection radius** | 75 meters (arrival) / 80 meters (departure) |
| **Dwell-time confirmation** | 3 seconds sustained |
| **ETA smoothing factor** | α = 0.25 (responsive yet stable) |
| **Segment learning rate** | β = 0.15 (conservative, prevents overfitting) |
| **OSRM cache TTL** | 15 seconds |
| **GPS breadcrumb storage** | Max 1000 points per trip ($slice) |
| **Stale trip auto-cleanup** | After 12 hours |
| **Socket.IO offline buffer** | Queues GPS updates during connectivity gaps |

### B. System Capabilities

| Feature | Outcome |
|---------|---------|
| Real-time tracking | Students see live bus position with sub-second latency |
| Automatic stop detection | System auto-detects arrival/departure with 75m radius and 3s confirmation window |
| ETA accuracy | Multi-source ETAs with exponential smoothing reduce prediction jitter |
| Self-learning | Segment travel times improve progressively with each completed trip via EMA |
| Push notifications | Students receive alerts when bus approaches — configurable thresholds (1–30 min, 100–2000m) |
| Fleet management | Admin has complete visibility: live positions, analytics, trip history, CSV export |
| Cross-platform deployment | PWA works on Android, iOS, and desktop without app store deployment |
| Offline resilience | Socket.IO offline buffer queues GPS updates during connectivity gaps, replays on reconnect |

### C. Application Scale

| Component | Count |
|-----------|-------|
| Mongoose data models | 7 |
| REST API endpoints | 56 |
| Socket.IO client → server events | 7 |
| Socket.IO server → client events | 12+ |
| Backend controller files | 12 |
| Middleware layers | 3 |
| Utility modules | 6 |
| React page components | 13 |
| Reusable React components | 14 |
| Custom React hooks | 4 |
| React context providers | 2 |
| Frontend build modules | 2151+ |

---

## X. KEY TECHNICAL DECISIONS

| Decision | Rationale |
|----------|-----------|
| **Socket.IO over REST polling** | Bidirectional communication with < 1s latency, room-based broadcasting to specific trip subscribers |
| **In-memory trip cache (Map)** | Avoids database reads on every GPS update (up to 1/second); sub-millisecond geofence checks |
| **OSRM + multi-layer fallbacks** | Road routing is most accurate but can fail; segment stats and distance/speed ensure continuity |
| **Geofence with sustained dwell** | 3-second dwell requirement prevents false arrivals from buses passing near stops at traffic lights |
| **EMA smoothing (α = 0.25)** | Prevents ETA jitter from noisy GPS while remaining responsive to genuine speed changes |
| **MongoDB with Mongoose** | Flexible schema for evolving data model; embedded arrays for stops (fast reads); references for relationships |
| **PWA over native app** | Cross-platform (Android + iOS), no app store deployment, instant updates, works offline |
| **Single User model with roles** | Simpler authentication logic; unified login endpoint; role separation via middleware |
| **Segment stats learning (β = 0.15)** | Conservative learning rate prevents overfitting to anomalous trips while still improving over time |

---

## XI. SECURITY IMPLEMENTATION

| Security Measure | Implementation |
|-----------------|----------------|
| **Password storage** | bcrypt with 10 salt rounds (never plain text) |
| **Authentication** | JWT tokens (HS256, 12-hour expiry) |
| **Authorization** | Role-based middleware chain (admin/driver/student) |
| **Brute-force protection** | Rate limiting: 10 login attempts per 15 minutes per IP |
| **Registration spam** | Rate limiting: 5 registrations per hour per IP |
| **NoSQL injection** | Recursive `$`-key detection middleware rejects malicious payloads |
| **CORS** | Origin whitelist in production; permissive in development |
| **Push subscription validation** | Rejects non-HTTPS and permanently-removed endpoints |
| **First-login enforcement** | Forces password change before accessing any feature |
| **Token security** | localStorage storage avoids CSRF; auto-redirect on 401 |

---

## XII. DEPLOYMENT ARCHITECTURE

| Component | Platform | Configuration |
|-----------|----------|---------------|
| **Backend** | Render (Web Service) | Node.js runtime, environment variables, auto-deploy from GitHub |
| **Frontend** | Vercel | Static site hosting, SPA routing via vercel.json, environment variables |
| **Database** | MongoDB Atlas | Cloud-hosted cluster, connection via MONGO_URI |
| **Routing** | OSRM | Public API (router.project-osrm.org) |

The frontend auto-detects the environment:

- `localhost` → connects to `http://localhost:5000`
- LAN IP (192.168.x.x) → connects to `http://{hostname}:5000`
- Production → connects to configured `VITE_BACKEND_URL`

---

## XIII. FUTURE SCOPE

1. **Machine Learning-based ETA**: Train ML models on historical trip data to predict traffic-aware ETAs with higher accuracy
2. **Multi-route optimization**: Optimize bus routes based on student density and traffic patterns
3. **Attendance integration**: RFID/NFC-based student boarding and alighting detection
4. **Parent notification system**: Extend push notifications to parent/guardian mobile numbers
5. **Fleet analytics dashboard**: Fuel consumption, driver behavior scoring, route efficiency metrics
6. **Native mobile companion**: React Native app for enhanced background GPS and push notification capabilities
7. **Multi-institution support**: SaaS model supporting multiple colleges with isolated tenants
8. **Accessibility features**: Screen reader support, high-contrast mode, voice-based navigation

---

## XIV. CONCLUSION

TrackMate demonstrates that Progressive Web Application technology is a viable and effective approach to real-time campus transit tracking. The system's multi-layered ETA calculation strategy — combining OSRM road routing, geospatial distance computation, and self-learning segment statistics with exponential moving average smoothing — provides accurate and stable arrival predictions that improve over time. The geofence-based stop detection algorithm, with its dual-radius design and sustained dwell-time verification, reliably identifies bus arrivals while filtering out false positives from nearby traffic.

The WebSocket-based architecture using Socket.IO enables sub-second tracking latency with room-based broadcasting that scales efficiently to multiple concurrent trips. The in-memory trip state cache eliminates database bottlenecks on high-frequency GPS updates, while the PWA deployment model provides cross-platform accessibility without the overhead of native app development.

The system has been implemented with a comprehensive feature set including 56 REST API endpoints, 7 data models, 12+ real-time event types, and role-based dashboards for administrators, drivers, and students — all secured with JWT authentication, rate limiting, and NoSQL injection prevention.

---

## XV. REFERENCES

[1] OSRM — Open Source Routing Machine, "HTTP API Documentation," Available: <http://project-osrm.org/docs/v5.24.0/api/>

[2] Socket.IO, "Real-time bidirectional event-based communication," Available: <https://socket.io/docs/v4/>

[3] MongoDB, "MongoDB Atlas Documentation," Available: <https://www.mongodb.com/docs/atlas/>

[4] Leaflet, "An open-source JavaScript library for mobile-friendly interactive maps," Available: <https://leafletjs.com/>

[5] W3C, "Push API," W3C Working Draft, Available: <https://www.w3.org/TR/push-api/>

[6] W3C, "Service Workers," W3C Candidate Recommendation, Available: <https://www.w3.org/TR/service-workers/>

[7] W3C, "Screen Wake Lock API," W3C Candidate Recommendation, Available: <https://www.w3.org/TR/screen-wake-lock/>

[8] Turf.js, "Advanced geospatial analysis for browsers and Node.js," Available: <https://turfjs.org/>

[9] React, "A JavaScript library for building user interfaces," Available: <https://react.dev/>

[10] Vite, "Next Generation Frontend Tooling," Available: <https://vitejs.dev/>

[11] Express, "Fast, unopinionated, minimalist web framework for Node.js," Available: <https://expressjs.com/>

[12] JWT — JSON Web Tokens, "RFC 7519," Available: <https://datatracker.ietf.org/doc/html/rfc7519>

[13] Google, "Geolocation API," MDN Web Docs, Available: <https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API>

[14] W3C, "Web App Manifest," W3C Working Draft, Available: <https://www.w3.org/TR/appmanifest/>

---

## APPENDIX A: CONFIGURATION CONSTANTS

| Constant | Value | Purpose |
|----------|-------|---------|
| `RADIUS_METERS` | 75 m | Stop arrival detection radius |
| `SUSTAIN_TIME_MS` | 3000 ms | Dwell time to confirm arrival |
| `LEAVE_RADIUS_METERS` | 80 m | Stop departure detection radius |
| `MIN_UPDATE_INTERVAL_MS` | 1000 ms | GPS throttle interval |
| `ETA_ALPHA` | 0.25 | ETA exponential smoothing factor |
| `SEG_ALPHA` | 0.15 | Segment stats learning rate |
| `MIN_SPEED_MPS` | 0.8 m/s | Minimum speed threshold |
| `ASSUMED_SPEED_MPS` | 5 m/s | Default speed (~18 km/h) |
| `DEFAULT_SEG_SEC` | 120 s | Initial segment travel time (2 min) |
| `ETA_EMIT_DELTA_MS` | 5000 ms | Min ETA change to trigger update emission |
| `STALE_TRIP_HOURS` | 12 h | Auto-end trip threshold |
| `OSRM_CACHE_TTL_MS` | 15000 ms | OSRM response cache duration |

---

## APPENDIX B: PROJECT METRICS

| Metric | Value |
|--------|-------|
| Total backend code files | 45 |
| Total frontend source files | 59 |
| Location engine (core GPS processing) | 741 lines |
| Student dashboard | 800+ lines |
| Driver dashboard | 500+ lines |
| CSS design system | 5500+ lines |
| Database models | 7 schemas |
| REST API endpoints | 56 |
| Real-time socket events | 19+ |
| External service integrations | 4 (MongoDB Atlas, OSRM, Gmail SMTP, Web Push) |

---

*Developed by Maganti Praveen Sai as a final year project.*
