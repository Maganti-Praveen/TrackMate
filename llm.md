# TrackMate — Complete LLM Knowledge Base

> **Purpose:** This document is designed to give a Large Language Model (LLM) a deep, exhaustive understanding of every aspect of the TrackMate project. It covers architecture, every file, every function, every data model, every API endpoint, every WebSocket event, every algorithm, every configuration value, and every design decision. An LLM reading this document should be able to answer any question about TrackMate, write new features, fix bugs, and explain any behavior.

---

## 1. What is TrackMate?

TrackMate is a **full-stack, real-time school bus tracking system** built for **Ramachandra College of Engineering (RCE), Eluru, Andhra Pradesh, India**. It is a B.Tech CSE capstone project (2022–2026 batch).

**Core Purpose:** Enable students to track their assigned school bus live on a map, get accurate ETAs, receive push notifications, and redirect to alternative buses if they miss theirs.

**Deployment:**

- Backend: Render (Node.js web service)
- Frontend: Vercel (Vite SPA)
- Database: MongoDB Atlas (cluster: gagttrackmate)

**Live URLs:**

- Frontend: deployed on Vercel
- Backend API: deployed on Render
- Health check: `GET /ping` returns a styled HTML status page

---

## 2. Technology Stack (Exact Versions)

### Backend (Node.js)

```json
{
  "express": "^4.19.2",
  "socket.io": "^4.7.5",
  "mongoose": "^7.6.3",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^3.0.3",
  "web-push": "^3.6.7",
  "@turf/turf": "^6.5.0",
  "csv-parser": "^3.2.0",
  "multer": "^2.0.2",
  "express-rate-limit": "^8.2.1",
  "cors": "^2.8.5",
  "dotenv": "^16.4.5",
  "nodemon": "^3.1.0"
}
```

### Frontend (React)

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "vite": "^7.2.6",
  "react-router-dom": "^6.27.0",
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",
  "leaflet.pm": "^2.2.0",
  "socket.io-client": "^4.7.5",
  "axios": "^1.6.8",
  "framer-motion": "^12.23.26",
  "bootstrap": "^5.3.8",
  "lucide-react": "^0.561.0",
  "papaparse": "^5.5.3",
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "@dnd-kit/utilities": "^3.2.2",
  "react-hot-toast": "^2.6.0",
  "@turf/turf": "^7.3.0"
}
```

---

## 3. User Roles

There are exactly 3 roles:

### 3.1 Admin

- Created on first server startup (username: `admin`, password: `admin123`)
- Can manage everything: buses, drivers, routes, stops, students, assignments
- Can view live map of all buses, trip analytics, event timeline
- Can export trip data as CSV
- Can clear events and trip history
- Can access the driver simulator

### 3.2 Driver

- Created by admin via `/api/drivers` endpoint
- Default password is the username (must change on first login)
- Assigned to exactly one bus via `User.driverMeta.bus`
- Can start/end trips, share GPS location, trigger SOS
- Can use map click simulator for testing

### 3.3 Student

- Created by admin (individual or CSV bulk upload) or self-registered via `/api/auth/register`
- Default password is the username (roll number)
- Assigned to a bus and a stop via the StudentAssignment collection
- Can view live bus tracking, ETA, missed-bus redirect
- Can configure push notification preferences
- Can change their bus/stop assignment

---

## 4. Complete File-by-File Documentation

### 4.1 Backend Files

#### `server.js` (Main Entry Point)

- Creates Express app
- Middleware stack: `cors()`, `express.json()`, `express.urlencoded()`
- Rate limiters:
  - `loginLimiter`: 10 requests per 15 minutes on `/api/auth/login`
  - `registerLimiter`: 5 requests per hour on `/api/auth/register`
- Route mounts (all under `/api`):
  - `/api/auth` → authRoutes
  - `/api/buses` → busRoutes
  - `/api/routes` → routeRoutes
  - `/api/stops` → stopRoutes
  - `/api/drivers` → driverRoutes
  - `/api/trips` → tripRoutes
  - `/api/admin` → adminRoutes
  - `/api/students` → studentRoutes
  - `/api/student` → studentDashRoutes
  - `/api/notifications` → notificationRoutes
  - `/api/public` → publicRoutes
- Creates `http.createServer(app)` and wraps with Socket.IO:
  - CORS configured from `ALLOWED_ORIGINS` (comma-separated) or fallback to `*`
  - WebSocket transport only (`transports: ['websocket']`)
- Tracks live visitor count: increments on `connection`, decrements on `disconnect`, broadcasts `stats:live_visitors`
- Calls `registerLocationHandlers(io)` from `locationController.js`
- Connects to MongoDB via `connectDB()`, then calls `ensureDefaultAccounts()` to create admin
- Health check: `GET /ping` returns HTML with green status badge, uptime, memory usage, and timestamp
- Global error handler: suppresses stack traces in production
- Process-level handlers for unhandled rejections and uncaught exceptions

#### `config/db.js`

- Exports `connectDB()` which calls `mongoose.connect(MONGO_URI, { dbName: DB_NAME })`
- Logs connection host on success, exits process on failure

#### `config/constants.js`

- Loads `.env` via `dotenv.config()`
- Exports all constants:

  ```javascript
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-fallback-secret';
  const MONGO_URI = process.env.MONGO_URI;  // Required
  const DB_NAME = process.env.DB_NAME;      // Required
  const PORT = parseInt(process.env.PORT, 10) || 5000;
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
  const OSRM_BASE_URL = process.env.OSRM_BASE_URL || 'http://router.project-osrm.org';
  const STALE_TRIP_HOURS = parseInt(process.env.STALE_TRIP_HOURS, 10) || 12;
  
  // Stop detection parameters
  const RADIUS_METERS = 75;        // Geo-fence radius to detect "inside" a stop
  const SUSTAIN_TIME_MS = 3000;    // Minimum dwell time inside radius to confirm arrival
  const LEAVE_RADIUS_METERS = 80;  // Distance to confirm departure
  const MIN_UPDATE_INTERVAL_MS = 1000;  // GPS update throttle
  
  // ETA parameters
  const ETA_ALPHA = 0.25;          // Exponential smoothing factor
  const SEG_ALPHA = 0.15;          // Segment stats learning rate
  const MIN_SPEED_MPS = 0.8;       // Minimum speed threshold (m/s)
  const ASSUMED_SPEED_MPS = 5;     // Default assumed speed (~18 km/h)
  const DEFAULT_SEG_SEC = 120;     // Default segment travel time (seconds)
  const ETA_EMIT_DELTA_MS = 5000;  // Minimum ETA change to emit
  const OSRM_CACHE_TTL_MS = 15000; // OSRM cache validity (15 seconds)
  const CLOSE_RANGE_M = 100;       // Distance below which OSRM is bypassed
  
  // Email configuration
  const EMAIL_USER = process.env.EMAIL_USER || '';
  const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
  
  // Push notification
  const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
  const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@trackmate.com';
  ```

- Validates required env vars: MONGO_URI and DB_NAME must be present
- Warns if JWT_SECRET is using the fallback in production

#### `models/User.js`

```javascript
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'driver', 'student'], required: true },
  name: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
  firstLogin: { type: Boolean, default: true },
  driverMeta: {
    bus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus' }
  },
  pushSubscription: { type: Object, default: null },
  stopCoordinates: {
    lat: Number,
    lng: Number
  },
  // LEGACY fields (use StudentAssignment instead)
  assignedBusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus' },
  assignedStopId: { type: Number }
}, { timestamps: true });
```

- Emails cannot be empty strings (transformed to null by a pre-save hook or by the controller that sets them)
- The `sparse: true` on email allows multiple users to have no email without violating uniqueness

#### `models/Bus.js`

```javascript
const busSchema = new mongoose.Schema({
  name: { type: String, required: true },
  numberPlate: { type: String, required: true, unique: true, uppercase: true },
  capacity: { type: Number, default: 40 },
  driver: { type: ObjectId, ref: 'User', default: null },
  route: { type: ObjectId, ref: 'Route', default: null },
  isActive: { type: Boolean, default: true },
  lastKnownLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date
  }
}, { timestamps: true });
```

#### `models/Route.js`

```javascript
const routeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  geojson: { type: Object, default: null },  // GeoJSON LineString
  stops: [{
    name: String,
    lat: Number,
    lng: Number,
    seq: Number
  }],
  segStats: [{
    avgSec: { type: Number, default: 120 },
    samples: { type: Number, default: 0 }
  }]
}, { timestamps: true });
```

- `segStats` has one entry per segment (between consecutive stops). If a route has N stops, there are N-1 segments.
- `segStats[i]` represents the segment from `stops[i]` to `stops[i+1]`.

#### `models/Stop.js`

```javascript
const stopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  sequence: { type: Number, required: true },
  route: { type: ObjectId, ref: 'Route', required: true },
  averageTravelMinutes: { type: Number, default: 2 }
}, { timestamps: true });
```

#### `models/Trip.js`

```javascript
const tripSchema = new mongoose.Schema({
  bus: { type: ObjectId, ref: 'Bus', required: true, index: true },
  driver: { type: ObjectId, ref: 'User', required: true, index: true },
  route: { type: ObjectId, ref: 'Route' },
  status: { type: String, enum: ['PENDING', 'ONGOING', 'COMPLETED'], default: 'PENDING', index: true },
  currentStopIndex: { type: Number, default: 0 },
  startedAt: Date,
  endedAt: Date,
  lastLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date
  },
  locations: [{
    lat: Number,
    lng: Number,
    speed: Number,
    heading: Number,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });
```

- `locations[]` is capped at 1000 entries in the code (locationController truncates older entries)
- `status` lifecycle: PENDING → ONGOING → COMPLETED

#### `models/StudentAssignment.js`

```javascript
const studentAssignmentSchema = new mongoose.Schema({
  student: { type: ObjectId, ref: 'User', required: true, index: true },
  bus: { type: ObjectId, ref: 'Bus', required: true, index: true },
  stop: { type: ObjectId, ref: 'Stop', required: true, index: true },
  notificationPreferences: {
    enabled: { type: Boolean, default: true },
    proximityMinutes: { type: Number, default: 5, min: 1, max: 30 },
    proximityMeters: { type: Number, default: 500, min: 100, max: 2000 },
    lastProximityAlertTrip: { type: ObjectId, ref: 'Trip', default: null },
    arrivalAlert: { type: Boolean, default: true }
  }
}, { timestamps: true });
// Compound index: { bus: 1, student: 1 }
```

#### `models/StopEvent.js`

```javascript
const stopEventSchema = new mongoose.Schema({
  trip: { type: ObjectId, ref: 'Trip', required: true, index: true },
  stop: { type: ObjectId, ref: 'Stop' },
  stopIndex: Number,
  stopName: String,
  status: { type: String, enum: ['ARRIVED', 'LEFT', 'SOS'], required: true, index: true },
  message: String,
  timestamp: { type: Date, default: Date.now },
  location: { lat: Number, lng: Number },
  source: { type: String, enum: ['auto', 'manual'], default: 'auto' },
  etaMinutes: Number
}, { timestamps: true });
```

#### `controllers/locationController.js` (769 lines — THE CORE)

This is the most critical file in the entire project. It handles all real-time GPS processing.

**Function: `registerLocationHandlers(io)`**

- Called from `server.js` to register Socket.IO event handlers
- On each `connection`:
  1. Handles `auth:token` — verifies JWT, stores user data on socket, emits `auth:ready`
  2. Handles `driver:location_update` — the main GPS processing pipeline
  3. Handles `driver:manual_event` — manual stop events from driver
  4. Handles `driver:sos` — emergency broadcasts
  5. Handles `student:subscribe` / `student:unsubscribe` — trip room management
  6. Handles `public:subscribe` — anonymous trip subscription

**Function: `handleDriverLocationUpdate(io, socket, data)`**
The complete GPS processing pipeline:

1. **Validate** — Check that data has lat, lng, and tripId
2. **Throttle** — Skip if less than `MIN_UPDATE_INTERVAL_MS` since last update
3. **Get/Build Trip State** — From in-memory `activeTrips` cache or rebuild from MongoDB
4. **Update MongoDB** — Push to `Trip.locations[]` and update `Trip.lastLocation`, update `Bus.lastKnownLocation`
5. **Compute ETA** — Call `calculateEtas()` from `etaCalculator.js`
6. **Detect Stop** — Check geo-fence for arrival/departure
7. **Broadcast** — Emit `trip:location_update` and `trip:eta_update` to all room subscribers
8. **Check Proximity** — For each student on this bus, check if push notification should be sent
9. **Update In-Memory State** — Cache new position, ETA, and geo-fence state

**Stop Detection Inner Logic:**

```javascript
const dist = haversineDistance(
  { lat: data.lat, lng: data.lng },
  { lat: currentStop.lat, lng: currentStop.lng }
);

if (dist < RADIUS_METERS) {
  // Inside geo-fence
  if (!insideWindow.timestamps.length || insideWindow.stopIndex !== currentStopIndex) {
    insideWindow = { stopIndex: currentStopIndex, timestamps: [Date.now()], arrivedMarked: false, leftMarked: false };
  } else {
    insideWindow.timestamps.push(Date.now());
  }
  
  const span = insideWindow.timestamps[insideWindow.timestamps.length - 1] - insideWindow.timestamps[0];
  if (span >= SUSTAIN_TIME_MS && !insideWindow.arrivedMarked) {
    // CONFIRMED ARRIVAL
    insideWindow.arrivedMarked = true;
    createStopEvent(ARRIVED);
    emitStopEvent();
    sendPushToStudentsAtThisStop();
  }
} else if (dist > LEAVE_RADIUS_METERS && insideWindow.arrivedMarked && !insideWindow.leftMarked) {
  // CONFIRMED DEPARTURE
  insideWindow.leftMarked = true;
  createStopEvent(LEFT);
  observeSegmentTime();  // Update segment statistics
  advanceCurrentStopIndex();
  resetInsideWindow();
}
```

**Push Notification Logic (within location update):**

```javascript
// For each student assigned to this bus:
const assignment = await StudentAssignment.findOne({ bus: busId, student: studentId });
if (!assignment?.notificationPreferences?.enabled) continue;

const studentStop = routeStops.find(s => s._id.equals(assignment.stop));
if (!studentStop) continue;

const distToStop = haversineDistance(currentPosition, studentStop);

// Proximity check: either meters or ETA minutes
if (distToStop < assignment.notificationPreferences.proximityMeters
    || etaToStop < assignment.notificationPreferences.proximityMinutes * 60 * 1000) {
  
  // Only send once per trip
  if (assignment.notificationPreferences.lastProximityAlertTrip?.equals(tripId)) continue;
  
  // Send push
  sendPushNotification(student.pushSubscription, {
    title: `${bus.name} is approaching!`,
    body: `ETA: ${etaMinutes} min to ${studentStop.name}`,
    tag: 'proximity-alert'
  });
  
  // Mark as sent for this trip
  assignment.notificationPreferences.lastProximityAlertTrip = tripId;
  await assignment.save();
}
```

#### `controllers/authController.js` (296 lines)

- `login(req, res)`: Validates username/password, returns JWT token + user object
- `registerUser(req, res)`: Student self-registration (creates User with role: 'student')
- `getCurrentUser(req, res)`: Returns `req.user` (from authMiddleware)
- `updateProfile(req, res)`: Update name, email, phone; optionally change password (requires current password)
- `forgotPassword(req, res)`: Resets password to the username (roll number), sends email notification
- `ensureDefaultAccounts()`: Creates admin user with `username: 'admin'`, `password: 'admin123'` if none exists

#### `controllers/adminController.js` (374 lines)

- `assignStudent(req, res)`: Creates/updates StudentAssignment (student → bus + stop)
- `getAssignments(req, res)`: Returns all assignments with populated student, bus, and stop
- `updateAssignment(req, res)`: Updates an existing assignment
- `deleteAssignment(req, res)`: Deletes an assignment
- `getDashboardStats(req, res)`: Returns counts of buses, active trips, students, events, and active drivers
- `getActiveTrips(req, res)`: Returns all ONGOING trips with populated relations
- `getLiveBusPositions(req, res)`: Returns bus positions from in-memory activeTrips cache
- `getEvents(req, res)`: Returns StopEvents, optionally filtered by tripId
- `clearEvents(req, res)`: Deletes StopEvents (all or by tripId)
- `getTripAnalytics(req, res)`: Aggregates trip data for specified date range
- `exportTripsCSV(req, res)`: Generates CSV download of trip data

#### `controllers/driverController.js` (293 lines)

- `createDriverAccount(req, res)`: Admin creates driver user (password = username by default)
- `getAllDrivers(req, res)`: Lists all users with role: 'driver'
- `updateDriver(req, res)`: Updates driver info
- `deleteDriver(req, res)`: Deletes driver + unsets bus.driver reference
- `startTrip(req, res)`: Creates Trip with status ONGOING, initializes in-memory cache
- `endTrip(req, res)`: Sets Trip status to COMPLETED, removes from cache
- `shareLocation(req, res)`: REST-based location update (alternative to WebSocket)
- `recordStopEvent(req, res)`: Manual stop event creation
- `markApproaching(req, res)`: Marks bus as approaching a stop
- `getAssignedBus(req, res)`: Returns the bus assigned to the current driver

#### `controllers/studentController.js` (383 lines)

- `getAssignment(req, res)`: Finds StudentAssignment for current user, populates bus/stop/route
- `getEta(req, res)`: Computes ETA from active trip to student's assigned stop
- `getLiveTrip(req, res)`: Returns active trip data for student's bus
- `updateNotificationPreferences(req, res)`: Updates push notification settings
- `getNotificationPreferences(req, res)`: Returns current notification settings
- `updateMyAssignment(req, res)`: Student self-updates their bus/stop assignment
- `getBusesWithRoutes(req, res)`: Lists all buses with their routes for student selection UI

#### `controllers/missedBusController.js` (257 lines)

- In-memory `redirectMap = new Map()`: `{studentId → redirectState}`
- `reportMissedBus(req, res)`:
  1. Finds student's assignment
  2. Finds ONGOING trips on the same route where buffer stops remain
  3. If none found, searches cross-route trips within proximity
  4. Returns the redirect bus/trip info
- `getRedirectStatus(req, res)`: Returns current redirect state for student
- `cancelRedirect(req, res)`: Removes redirect from map
- `cleanupExpiredRedirects()`: Called every 5 minutes via `setInterval`, removes redirects where trip has ended

#### `controllers/routeController.js` (150 lines)

- `createRoute(req, res)`: Creates Route with embedded stops + syncs to Stop collection
- `getRoutes / getRoute`: Retrieve routes
- `updateRoute(req, res)`: Updates route, re-syncs stops
- `deleteRoute(req, res)`: Deletes route + all associated Stop documents
- `syncStopsForRoute(routeId, embeddedStops)`:
  - Deletes all existing Stop docs for this route
  - Creates new Stop docs from Route.stops[] embedded array
  - Ensures dual storage stays consistent

#### `controllers/tripController.js` (178 lines)

- `startTrip(req, res)`: Ends any previous ONGOING trip for this bus, creates new trip
- `endTrip(req, res)`: Marks trip as COMPLETED
- `getActiveTrip(req, res)`: Returns ONGOING trip for the current driver
- `getTrips(req, res)`: Lists trips with filtering
- `deleteDailyHistory(req, res)`: Deletes today's completed trips (for testing)
- `advanceToNextStop(req, res)`: Manually advance `currentStopIndex`

#### `controllers/busController.js`

- Standard CRUD: `createBus`, `getBuses`, `getBus`, `updateBus`, `deleteBus`
- When updating, handles driver and route assignment changes

#### `controllers/stopController.js`

- Standard CRUD: `createStop`, `getStops`, `getStop`, `updateStop`, `deleteStop`

#### `controllers/studentAdminController.js` (~280 lines)

- `createStudent(req, res)`: Admin creates student user
- `getAllStudents(req, res)`: Lists all students with assignments
- `updateStudent(req, res)`: Updates student info
- `deleteStudent(req, res)`: Deletes student + their assignment
- `bulkUploadStudents(req, res)`: Accepts CSV file via multer, parses with csv-parser, creates student accounts in bulk

#### `controllers/notificationController.js` (120 lines)

- `subscribePush(req, res)`: Saves `req.body.subscription` to `User.pushSubscription`
- `sendPush(userId, payload)`: Sends Web Push to a specific user
- `testPush(req, res)`: Sends a test push notification to the authenticated user
- Uses `web-push.sendNotification(subscription, JSON.stringify(payload))`

#### `controllers/eventController.js`

- `createEventRecord(tripId, data)`: Internal helper to create StopEvent documents

#### `inMemory/activeTrips.js`

```javascript
const activeTrips = new Map();
// Key: tripId (string)
// Value: {
//   trip: Trip document,
//   route: Route document (with segStats),
//   routeStops: merged stops array,
//   lastPosition: { lat, lng },
//   etaCache: { [stopId]: { smoothedMs, lastRawMs } },
//   insideWindow: { stopIndex, timestamps[], arrivedMarked, leftMarked },
//   osrmCache: { durations[], firstSegmentDuration, timestamp, startIndex },
//   lastEmitTs: number
// }

module.exports = {
  get: (tripId) => activeTrips.get(tripId),
  set: (tripId, state) => activeTrips.set(tripId, state),
  delete: (tripId) => activeTrips.delete(tripId),
  getAll: () => activeTrips,
  clear: () => activeTrips.clear()
};
```

#### `utils/etaCalculator.js`

Core function: `calculateEtas(currentPosition, routeStops, segStats, currentStopIndex, tripState)`

Returns: `{ [stopId]: etaMs }` for each remaining stop

Algorithm:

1. **Next Stop ETA:**
   - If within `CLOSE_RANGE_M` (100m): `ETA = distance / speed`
   - Else if OSRM cache valid: `ETA = osrmCache.firstSegmentDuration * 1000`
   - Else if OSRM fetch succeeds: cache and use
   - Else: `ETA = distance / Math.max(speed, ASSUMED_SPEED_MPS)`

2. **Subsequent Stops:**
   - If OSRM durations available: use `osrmCache.durations[offset]`
   - Else if `segStats[i]` exists with samples > 0: use `segStats[i].avgSec`
   - Else: use `DEFAULT_SEG_SEC` (120 seconds)

3. **OSRM Query:**

   ```
   GET {OSRM_BASE_URL}/route/v1/driving/{lng},{lat};{stop1_lng},{stop1_lat};{stop2_lng},{stop2_lat}...?overview=false
   ```

   - Parses `response.routes[0].legs[i].duration` for each segment
   - Caches with `OSRM_CACHE_TTL_MS` (15s)

4. **Smoothing:**

   ```javascript
   smoothed = previousSmoothed + ETA_ALPHA * (raw - previousSmoothed)
   ```

   Only emitted if change > `ETA_EMIT_DELTA_MS` (5s)

#### `utils/geoUtils.js`

- `haversineDistance({ lat, lng }, { lat, lng })`: Returns distance in meters
- `projectPointOnLine(point, lineGeoJSON)`: Uses turf.js `nearestPointOnLine` to find closest point on route
- `remainingDistanceOnLine(point, lineGeoJSON)`: Uses turf.js `lineSlice` to compute remaining route distance

#### `utils/emailService.js`

- Uses Brevo HTTP API (POST `https://api.brevo.com/v3/smtp/email`)
- Templates:
  1. **Welcome Email**: Sent when admin creates a student. Includes username, password, logo, "Login Now" button.
  2. **Stop Arrival Email**: Sent when bus arrives at a student's stop. Includes bus name, stop name, arrival time.
  3. **Password Reset Email**: Sent when password is reset. Includes new password.
- All emails use styled HTML templates with TrackMate branding (orange accent color)
- Sender: `TrackMate RCE <{EMAIL_USER}>`

#### `utils/notificationService.js`

- `sendToStudentsOnBus(busId, payload)`: Finds all StudentAssignments for a bus, then sends Web Push to each student's subscription
- `sendSOS(busId, message, location)`: Sends SOS notification with `requireInteraction: true`, extra vibration pattern `[500, 200, 500, 200, 500]`
- Validates push subscription endpoints (must be HTTPS)
- Handles 410 (Gone) responses by clearing the user's `pushSubscription`

#### `utils/segmentStats.js`

- `observeSegment(routeId, segmentIndex, observedSeconds)`: Updates `Route.segStats[segmentIndex]` with EMA

  ```javascript
  const SEG_ALPHA = 0.15;
  const newAvg = SEG_ALPHA * observed + (1 - SEG_ALPHA) * previous;
  ```

- Called from locationController when a bus departs a stop (observed time = arrival - last departure)

#### `utils/logger.js`

- Exports `debug()`, `info()`, `warn()`, `error()` functions
- In production, suppresses debug and info logs
- Adds `[TrackMate]` prefix to all log messages

#### `middleware/authMiddleware.js`

```javascript
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Authentication token missing' });
  
  const decoded = jwt.verify(token, JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) return res.status(401).json({ message: 'User not found' });
  
  req.user = user;
  next();
};
```

- Handles `TokenExpiredError` specifically (expected case, no console.error)
- All other JWT errors logged as errors

#### `middleware/roleMiddleware.js`

```javascript
const roleMiddleware = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};
```

#### `middleware/validateMiddleware.js`

- `validateObjectId(paramName)`: Checks `req.params[paramName]` or `req.body[paramName]` is valid MongoDB ObjectId
- `validateObjectIds(...paramNames)`: Validates multiple params
- `validateCoordinates(req, res, next)`: Validates lat (-90 to 90) and lng (-180 to 180)
- `sanitizeInput(req, res, next)`: Recursively checks `req.body` for keys starting with `$` (NoSQL injection prevention)

#### Route Files (11 files)

Each route file follows the pattern:

```javascript
const router = express.Router();
router.use(authMiddleware);  // Protected routes
router.use(roleMiddleware('admin'));  // Role restriction
router.get('/', controller.getAll);
// ... CRUD endpoints
module.exports = router;
```

Notable routes:

- `publicRoutes.js`: NO auth middleware — public endpoints
- `studentRoutes.js`: Includes missed bus endpoints (`POST /missed-bus`, `GET /redirect-status`, `POST /cancel-redirect`)
- `adminRoutes.js`: Includes analytics and CSV export endpoints

### 4.2 Frontend Files

#### `main.jsx` — Application Entry Point

Complete route configuration:

```
/ → Redirect to /login
/login → Login
/admin → AdminDashboard (admin only)
/admin/buses → ManageBuses (admin only)
/admin/drivers → ManageDrivers (admin only)
/admin/routes → ManageRoutes (admin only)
/admin/stops → ManageStops (admin only)
/admin/assignments → AssignStudents (admin only)
/admin/students → ManageStudents (admin only)
/driver → DriverDashboard (driver only)
/driver-sim → DriverSimulator (driver + admin)
/student → StudentDashboard (student only)
/profile → Profile (all authenticated)
/track → TrackSelector (public, no auth)
/track/:busName → PublicTracking (public, no auth)
* → NotFound
```

Structure:

```jsx
<ThemeProvider>
  <AuthProvider>
    <App>  // Navbar + Outlet (react-router)
      {/* Route components rendered here */}
    </App>
  </AuthProvider>
</ThemeProvider>
```

Service worker registered on mount: `registerServiceWorker()`

#### `App.jsx`

Simple layout:

```jsx
<Navbar />
<Outlet />  // React Router renders active page here
<Toaster />  // react-hot-toast container
```

#### `context/AuthContext.jsx`

- Stores `user`, `token`, `loading` in state
- Persists token in `localStorage` under key `tm_token`
- Persists user in `localStorage` under key `tm_user`
- `login({ username, password })`: Posts to `/api/auth/login`, persists session, redirects based on role
  - First login → redirects to `/profile` (force password change)
  - Admin → `/admin`
  - Driver → `/driver`
  - Student → `/student`
- `logout()`: Clears localStorage, disconnects WebSocket, navigates to `/login`
- On mount: reads saved token/user from localStorage, if token exists calls `/api/auth/me` to validate

#### `context/ThemeContext.jsx`

- Stores theme (`dark` or `light`) in state
- Persists to `localStorage` under key `tm_theme`
- Applies `data-theme` attribute on `document.documentElement`
- Default: `dark`

#### `hooks/useSocket.js` (211 lines)

- Singleton Socket.IO instance (one per browser tab)
- `getSocket()`: Creates socket if not exists, configured with `transports: ['websocket']`, `autoConnect: false`
- `refreshSocketAuth()`: Sends `auth:token` with JWT from localStorage
- `disconnectSocket()`: Disconnects singleton
- `flushBuffer()`: Drains offline buffer when connection restores
- `emitLocation(payload)`: Emits `driver:location_update` with retry logic (3 retries, exponential backoff)
- `useSocket(handlers)`: React hook that:
  1. Connects socket on mount
  2. Handles `connect`, `disconnect`, `auth:ready`, `reconnect` events
  3. Subscribes to custom event handlers (passed as `{eventName: callback}` object)
  4. Returns `{ socket, isConnected, isAuthenticated, bufferSize, emitLocation }`
  5. Uses `useRef` for handlers to avoid re-subscribing on every render

#### `hooks/useGeolocation.js` (~130 lines)

- Uses `navigator.geolocation.watchPosition()` with high accuracy
- Configurable options: `enableHighAccuracy`, `timeout`, `maximumAge`
- Returns `{ position: {lat, lng, speed, heading, accuracy, timestamp}, error, isTracking }`
- Stops tracking on unmount

#### `hooks/useAuth.js`

```javascript
const useAuth = () => useContext(AuthContext);
export default useAuth;
```

#### `hooks/useWakeLock.js` (~140 lines)

- Uses `navigator.wakeLock.request('screen')` to prevent screen dimming
- Automatically re-acquires lock on visibility change (tab switch back)
- Returns `{ isLocked, request, release }`
- Handles browsers that don't support Wake Lock API

#### `utils/api.js` (shared Axios instance)

```javascript
import axios from 'axios';
import { API_BASE_URL } from '../constants/api';

export const api = axios.create({ baseURL: `${API_BASE_URL}/api` });

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};
```

#### `utils/offlineBuffer.js`

Circular buffer for GPS updates when offline:

```javascript
const MAX_SIZE = 50;
const buffer = [];

export default {
  push(item) { buffer.push(item); if (buffer.length > MAX_SIZE) buffer.shift(); },
  drain() { return buffer.splice(0); },
  size() { return buffer.length; }
};
```

#### `utils/notifications.js`

- `registerServiceWorker()`: Registers `/sw.js`
- `subscribePush(registration)`: Calls `registration.pushManager.subscribe()` with VAPID key
- `urlBase64ToUint8Array(base64String)`: Converts VAPID key format

#### `utils/debounce.js`

- Configurable debounce with leading/trailing edge support
- Used for GPS update throttling on the frontend

#### `utils/etaUtils.js`

- `formatEta(ms)`: Converts milliseconds to human-readable "X min Y sec"
- `formatEtaShort(ms)`: Shorter format "Xm"

#### `utils/mapUtils.js`

- Map utility functions for coordinate conversions
- Center and zoom calculations

#### `constants/api.js`

```javascript
const hostname = window.location.hostname;
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
const isLAN = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL
  || (isLocalhost ? 'http://localhost:5000'
    : isLAN ? `http://${hostname}:5000`
    : window.location.origin);

export const API_ROOT = `${API_BASE_URL}/api`;
```

#### `constants/geo.js`

```javascript
export const ELURU_CENTER = { lat: 16.7107, lng: 81.0952 };
export const DEFAULT_ZOOM = 13;
export const ELURU_SIM_PATH = [
  // Array of [lat, lng] waypoints for the driver simulator
  // Covers Eluru to RCE campus route
];
```

#### `public/sw.js` (Service Worker)

- `CACHE_VERSION = 'trackmate-v2'`
- `STATIC_CACHE = 'trackmate-static-v1'`
- **Install:** Pre-caches `/`, `/offline.html`, favicon icons, manifest
- **Activate:** Deletes old caches
- **Fetch:**
  - Skip non-GET and API/socket.io requests
  - Navigation: network-first, offline fallback
  - Static assets: cache-first, network fallback
- **Push:** Parses JSON payload, shows notification with custom options
  - SOS tag gets `vibrate: [500, 200, 500, 200, 500]`
  - All notifications have `requireInteraction: true` and `renotify: true`
- **NotificationClick:** Focuses existing window or opens new one

#### `public/manifest.json`

```json
{
  "name": "TrackMate",
  "short_name": "TrackMate",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#FF6B2C",
  "icons": [
    { "src": "/favicons/android-chrome-192x192.png", "sizes": "192x192" },
    { "src": "/favicons/android-chrome-512x512.png", "sizes": "512x512" }
  ]
}
```

#### `public/offline.html`

Styled HTML page shown when the user is offline. Branded with TrackMate logo, dark background, message: "You're currently offline. TrackMate needs an internet connection for real-time tracking."

#### Frontend Page Components (Key Detail)

**StudentDashboard.jsx (1006 lines)**

- State: `assignment`, `liveTrip`, `busPosition`, `etas`, `events`, `loading`, `notificationsEnabled`, `redirectState`
- On mount:
  1. Fetch `/api/student/assignment` → get bus, stop, route
  2. Check `/api/students/redirect-status` → if redirect active, switch tracking
  3. Subscribe to trip via WebSocket `student:subscribe`
  4. Start polling `/api/student/live-trip` every 5 seconds as fallback
- WebSocket handlers:
  - `trip:location_update` → update bus marker position
  - `trip:eta_update` → update ETA displays
  - `trip:stop_event` → add to event timeline, show toast
  - `bus:trip_started` → auto-subscribe to new trip
- Missed Bus Flow:
  1. Student clicks "Missed Bus"
  2. POST `/api/students/missed-bus` → returns redirect bus/trip
  3. UI switches to show redirect bus info
  4. Unsubscribe from original trip, subscribe to redirect trip
- Notification Preferences: configurable proximity (meters + minutes), arrival alerts
- Text-to-Speech: Uses `window.speechSynthesis.speak()` to read current ETA

**DriverDashboard.jsx (516 lines)**

- State: `tripState`, `isTracking`, `speed`, `log`
- Uses `useGeolocation` hook for GPS tracking
- WebSocket: sends `driver:location_update` on each GPS update
- Trip lifecycle: Start Trip → GPS streaming → Stop events → End Trip
- SOS: emits `driver:sos` event
- Map click: allows manual location override for testing
- Debug log: collapsible panel showing real-time events

**PublicTracking.jsx (~370 lines)**

- Route: `/track/:busName`
- Fetches `/api/public/track/:busName` for bus data
- Subscribes via `public:subscribe` WebSocket event
- No authentication required
- Shows: bus marker, route polyline, stop markers, bus info panel
- URL matching: case-insensitive, space-insensitive (e.g., `/track/BusNo30` matches "Bus No 30")

**TrackSelector.jsx (~155 lines)**

- Route: `/track`
- Fetches `/api/public/buses` → lists all buses
- Shows active status (green/red dot) for each bus
- Dropdown selection → navigates to `/track/{busName}`

**MapEditor.jsx (~580 lines - component)**

- Used in ManageRoutes for route creation/editing
- Features:
  - Draw route polyline with leaflet.pm
  - Place stop markers by clicking
  - Drag-and-drop stop reordering (@dnd-kit)
  - Import GeoJSON
  - Auto-fit bounds to route

---

## 5. Data Flow Scenarios

### 5.1 Complete Trip Lifecycle

```
1. ADMIN creates Bus, Route (with stops), Driver account
2. ADMIN assigns Driver to Bus (Bus.driver = driverId, User.driverMeta.bus = busId)
3. ADMIN assigns Students to Bus + Stop (StudentAssignment documents)
4. DRIVER opens /driver, system fetches assigned bus
5. DRIVER taps "Start Trip"
   → POST /api/driver/start-trip
   → Trip created (status: ONGOING)
   → In-memory activeTrips cache populated
   → bus:trip_started emitted to all connected students on this bus
6. DRIVER starts GPS tracking (useGeolocation hook)
   → Every GPS update emitted via WebSocket: driver:location_update {lat, lng, speed, heading}
   → Server processes: validate, throttle, persist, compute ETA, check geo-fence
   → Broadcasts: trip:location_update, trip:eta_update
7. Bus approaches Stop 1 (within 75m):
   → Geo-fence enters "inside window"
   → After 3s dwell: ARRIVED event created
   → StopEvent(ARRIVED) persisted
   → trip:stop_event emitted
   → Push notification sent to students at Stop 1
   → Email sent (if Brevo configured)
8. Bus departs Stop 1 (moves beyond 80m):
   → LEFT event created
   → Segment stats updated (EMA)
   → currentStopIndex advanced
9. DRIVER taps "End Trip"
   → POST /api/driver/end-trip/:tripId
   → Trip status → COMPLETED
   → In-memory cache cleared
10. STUDENT sees trip ended, UI shows "No active trip"
```

### 5.2 Missed Bus Redirect Flow

```
1. STUDENT opens /student dashboard
2. Bus is active but has already passed student's stop (currentStopIndex > studentStopIndex)
3. STUDENT taps "Missed Bus"
   → POST /api/students/missed-bus { studentId }
4. SERVER:
   a. Find student's assignment (bus, stop, route)
   b. Find all ONGOING trips on same route where currentStopIndex < studentStopSequence
   c. If found: return nearest bus (by ETA/distance)
   d. If not: check cross-route trips with nearby stops
   e. Store redirect in in-memory redirectMap
5. STUDENT dashboard switches tracking to redirect bus
   → Unsubscribe from original trip room
   → Subscribe to redirect trip room
6. STUDENT can cancel redirect at any time
   → POST /api/students/cancel-redirect
   → redirectMap entry removed
   → UI switches back to original bus
```

### 5.3 Push Notification Flow

```
1. STUDENT enables notifications in dashboard
   → Browser shows "Allow notifications?" prompt
   → PushSubscription created (VAPID key, endpoint, keys)
   → POST /api/notifications/subscribe { subscription }
   → User.pushSubscription = subscription (persisted in MongoDB)
2. During trip, on each GPS update:
   → Server checks distance from bus to each student's assigned stop
   → If within proximityMeters (default 500m) or ETA < proximityMinutes (default 5min):
     → Check lastProximityAlertTrip to prevent duplicates
     → web-push.sendNotification(subscription, JSON.stringify(payload))
     → Mark lastProximityAlertTrip = currentTripId
3. Service worker receives push event:
   → Parses JSON payload
   → Shows notification with title, body, icon, vibration
4. User clicks notification:
   → Service worker focuses existing app window or opens new one
```

---

## 6. Key Design Decisions

### 6.1 Why WebSocket (Socket.IO) for GPS?

- REST polling would create N requests/second × M students = unacceptable server load
- WebSocket provides push-based updates to all subscribers simultaneously
- Socket.IO adds automatic reconnection, fallback transports, and room-based broadcasting

### 6.2 Why In-Memory Trip State Cache?

- GPS updates arrive at 1Hz per bus. Reading route/stops from MongoDB on every update would be 1+ DB read/second/bus.
- In-memory Map provides O(1) lookup with zero DB overhead for the hot path
- Trade-off: if server restarts, cache is rebuilt from MongoDB (handled by `rebuildState()` in activeTrips)

### 6.3 Why Dual Stop Storage (Embedded + Separate Collection)?

- **Embedded in Route:** Fast reads during trip processing (one document read gets route + stops)
- **Separate Stop Collection:** Required for StudentAssignment foreign keys (relational queries)
- `syncStopsForRoute()` keeps both in sync

### 6.4 Why OSRM Instead of Google Maps API?

- Free and open-source (no API key cost)
- Self-hostable for production (no rate limits)
- Uses real road network data (OpenStreetMap)
- Fallback to segment stats + speed-based if OSRM is unreachable

### 6.5 Why PWA Instead of Native Mobile Apps?

- Single codebase for all platforms (web, Android, iOS)
- No app store approval process
- Instant updates (no app store delay)
- Installable via browser "Add to Home Screen"
- Push notifications via Web Push (standard protocol)

### 6.6 Why Brevo Instead of Nodemailer/SMTP?

- Brevo HTTP API is more reliable than SMTP for transactional emails
- Free tier includes 300 emails/day
- No SMTP server configuration needed
- Handles bounces and delivery tracking

---

## 7. Configuration Reference

### 7.1 All Environment Variables

**Backend `.env`:**

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/?appName=TrackMate
DB_NAME=TrackMatev1
JWT_SECRET=your-secret-key
ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app
OSRM_BASE_URL=http://router.project-osrm.org
STALE_TRIP_HOURS=12
EMAIL_USER=your-email@gmail.com
BREVO_API_KEY=xkeysib-your-key
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=mailto:admin@trackmate.com
```

**Frontend `.env`:**

```env
VITE_BACKEND_URL=https://your-backend.onrender.com
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
VITE_MIN_UPDATE_INTERVAL_MS=1000
```

### 7.2 All Configurable Constants

| Constant | File | Value | Description |
|---|---|---|---|
| `RADIUS_METERS` | `constants.js` | 75 | Stop arrival geo-fence radius (meters) |
| `SUSTAIN_TIME_MS` | `constants.js` | 3000 | Minimum dwell time for arrival confirmation (ms) |
| `LEAVE_RADIUS_METERS` | `constants.js` | 80 | Stop departure confirmation radius (meters) |
| `MIN_UPDATE_INTERVAL_MS` | `constants.js` | 1000 | GPS update throttle interval (ms) |
| `ETA_ALPHA` | `constants.js` | 0.25 | ETA exponential smoothing factor |
| `SEG_ALPHA` | `constants.js` | 0.15 | Segment stats EMA learning rate |
| `MIN_SPEED_MPS` | `constants.js` | 0.8 | Minimum speed threshold (m/s) |
| `ASSUMED_SPEED_MPS` | `constants.js` | 5 | Default speed when GPS speed unavailable (~18 km/h) |
| `DEFAULT_SEG_SEC` | `constants.js` | 120 | Default segment travel time when no stats exist (sec) |
| `ETA_EMIT_DELTA_MS` | `constants.js` | 5000 | Minimum ETA change to trigger emission (ms) |
| `OSRM_CACHE_TTL_MS` | `constants.js` | 15000 | OSRM cache validity duration (ms) |
| `CLOSE_RANGE_M` | `constants.js` | 100 | Distance below which OSRM is bypassed (m) |
| `STALE_TRIP_HOURS` | `.env` | 12 | Auto-end trips after N hours |
| `MAX_SIZE` (buffer) | `offlineBuffer.js` | 50 | Maximum offline GPS buffer size |
| `MAX_RETRIES` (socket) | `useSocket.js` | 3 | WebSocket emit retry attempts |
| `proximityMinutes` | StudentAssignment | 5 | Default notification proximity (minutes) |
| `proximityMeters` | StudentAssignment | 500 | Default notification proximity (meters) |

---

## 8. Error Handling Patterns

### 8.1 Backend

- All controller functions wrapped in try-catch
- Returns appropriate HTTP status codes: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 500 (server error)
- Global error handler in `server.js` catches unhandled route errors
- Stack traces suppressed in production
- Process-level handlers for unhandled rejections and uncaught exceptions

### 8.2 Frontend

- Axios interceptor catches 401 responses → auto-logout
- React Router error boundaries for page-level crashes
- Service worker failures silently logged (don't break app)
- Socket.IO reconnection with offline buffer
- Toast notifications for user-facing errors

### 8.3 WebSocket

- Invalid tokens → socket `auth:error` event
- Expired sessions → reconnect with new token
- Network loss → offline buffer (50 point max)
- Server restart → automatic reconnection + re-auth

---

## 9. Geographic Context

TrackMate is deployed for Ramachandra College of Engineering, located in Eluru, Andhra Pradesh, India.

- **Eluru center coordinates:** lat 16.7107, lng 81.0952
- **Map default zoom:** 13
- **Bus routes:** Cover Eluru city and surrounding areas (Madhepalli, Vangayagudem, etc.)
- **Test buses:**
  - Bus No 30 (Eluru route, plate: AP ELR BUS 30)
  - Bus 4 (Madhepalli–Vangayagudem–RCE, plate: AP 1234)
  - Eluru Bus (plate: AP ELR BUS 01)

---

## 10. Team Information

| Name | Roll Number | Role |
|---|---|---|
| Maganti Praveen Sai | 22ME1A05G5 | Full Stack Developer & System Architect |
| Chandu Anand Sai Vivek | 23ME5A0512 | Backend Developer |
| Mamidibattula Chandra Sreya | 22ME1A05G6 | Frontend Developer |
| Perla Kirthana | 22ME1A05H8 | Frontend & Documentation Support |

**Mentor:** Prof./Ms. Rajeswari Bolla, CSE Department, RCE

**Institution:** Ramachandra College of Engineering (RCE)  
**Location:** Eluru, Andhra Pradesh, India  
**Program:** B.Tech Computer Science & Engineering, 2022–2026

---

## 11. Glossary

| Term | Definition |
|---|---|
| **OSRM** | Open Source Routing Machine — calculates driving distances/durations using OpenStreetMap road data |
| **VAPID** | Voluntary Application Server Identification — standard for identifying push service servers |
| **EMA** | Exponential Moving Average — weighted average that gives more weight to recent observations |
| **Geo-fence** | Virtual boundary around a geographic area used to detect entry/exit |
| **Dwell time** | Duration a bus must remain within a geo-fence to confirm arrival |
| **PWA** | Progressive Web App — web application that can be installed like a native app |
| **Segment** | The road section between two consecutive stops on a route |
| **Breadcrumb** | A GPS point in the trip's location history |
| **Trip room** | A Socket.IO room that all subscribers to a specific trip join |
| **Offline buffer** | Client-side circular buffer storing GPS updates when WebSocket is disconnected |
| **Brevo** | Email service provider (formerly Sendinblue), used for transactional emails |
| **SOS** | Emergency alert broadcast by driver to all students on the bus |

---

*This document provides exhaustive coverage of every aspect of the TrackMate system. An LLM with this knowledge should be able to understand, modify, debug, and extend any part of the codebase.*
