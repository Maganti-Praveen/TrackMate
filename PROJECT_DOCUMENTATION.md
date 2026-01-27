# TrackMate - Complete Project Documentation

> **Real-Time School/College Bus Tracking System**
> 
> A modern, full-stack Progressive Web Application (PWA) for real-time bus tracking with intelligent ETA calculations, push notifications, and comprehensive fleet management.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Features](#4-features)
5. [User Roles](#5-user-roles)
6. [Database Schema](#6-database-schema)
7. [Backend API](#7-backend-api)
8. [Frontend Structure](#8-frontend-structure)
9. [Real-Time Communication](#9-real-time-communication)
10. [ETA Calculation Engine](#10-eta-calculation-engine)
11. [Push Notifications](#11-push-notifications)
12. [PWA Features](#12-pwa-features)
13. [Security](#13-security)
14. [Configuration](#14-configuration)
15. [Deployment](#15-deployment)
16. [File Structure](#16-file-structure)

---

## 1. Project Overview

### What is TrackMate?

TrackMate is a comprehensive bus tracking system designed for schools and colleges. It enables:

- **Students** to track their assigned bus in real-time and receive ETAs
- **Drivers** to broadcast their location and manage trips
- **Administrators** to manage the entire fleet, routes, and assignments

### Key Differentiators

1. **"God Mode" Simulation** - Drivers can test without driving by clicking on a map to teleport
2. **Intelligent ETA Engine** - Uses OSRM routing with fallback to haversine calculations
3. **SOS Emergency System** - Instant emergency broadcasts with push notifications
4. **Offline-First PWA** - Works even when the app is closed or phone is locked
5. **Voice Announcements** - Text-to-speech for accessibility
6. **Route Lab** - Visual drag-and-drop route designer

### Problem Solved

Traditional bus tracking suffers from:
- Laggy GPS updates
- Silent notification failures
- No offline support
- Complex route management

TrackMate solves these with real-time WebSocket communication, intelligent smoothing, and a modern PWA architecture.

---

## 2. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React + Vite)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │   Student   │  │   Driver    │  │    Admin    │                  │
│  │  Dashboard  │  │  Dashboard  │  │  Dashboard  │                  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
│         │                │                │                         │
│  ┌──────┴────────────────┴────────────────┴──────┐                  │
│  │              Shared Components                │                  │
│  │  (Navbar, Maps, Drawer, ConfirmDialog, etc.)  │                  │
│  └──────────────────────┬───────────────────────┘                  │
│                         │                                           │
│  ┌──────────────────────┴───────────────────────┐                  │
│  │    Hooks (useAuth, useSocket, useGeolocation) │                  │
│  └──────────────────────┬───────────────────────┘                  │
│                         │                                           │
│  ┌──────────────────────┴───────────────────────┐                  │
│  │   Context (AuthContext, ThemeContext)         │                  │
│  └──────────────────────┬───────────────────────┘                  │
└─────────────────────────┼───────────────────────────────────────────┘
                          │
                          │ HTTP (REST) + WebSocket (Socket.IO)
                          │
┌─────────────────────────┼───────────────────────────────────────────┐
│                         ▼                                           │
│                    BACKEND (Node.js + Express)                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     Express Server                           │   │
│  │  ┌─────────┐  ┌─────────────┐  ┌────────────────────────┐   │   │
│  │  │  Auth   │  │   Routes    │  │  Socket.IO Handlers    │   │   │
│  │  │Middleware│  │ (REST API)  │  │ (Real-time Location)   │   │   │
│  │  └─────────┘  └─────────────┘  └────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│  ┌───────────────────────────┴───────────────────────────────┐     │
│  │                     Controllers                            │     │
│  │  auth, admin, bus, driver, route, stop, trip, location,    │     │
│  │  student, event, notification                              │     │
│  └───────────────────────────┬───────────────────────────────┘     │
│                              │                                      │
│  ┌───────────────────────────┴───────────────────────────────┐     │
│  │                 In-Memory State (activeTrips)              │     │
│  └───────────────────────────┬───────────────────────────────┘     │
│                              │                                      │
│  ┌───────────────────────────┴───────────────────────────────┐     │
│  │                    MongoDB (Mongoose)                      │     │
│  │  User, Bus, Route, Stop, Trip, StopEvent, StudentAssignment│     │
│  └───────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │
│  │    OSRM     │  │ OpenStreet  │  │    Web Push (VAPID)         │ │
│  │   Routing   │  │    Map      │  │    Notifications            │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. DRIVER LOCATION UPDATE:
   Driver GPS → useGeolocation hook → Socket.IO emit → 
   locationController → Update Trip/Bus → Broadcast to Students

2. STUDENT ETA REQUEST:
   StudentDashboard → Socket.IO → locationController → 
   OSRM API (or fallback) → ETA Calculation → Broadcast

3. SOS EMERGENCY:
   Driver triggers SOS → Socket.IO → Broadcast to all students on bus → 
   Push Notifications → Override modal on student screens
```

---

## 3. Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime environment |
| Express.js | 4.19 | HTTP server framework |
| MongoDB | 7+ | Database |
| Mongoose | 7.6 | ODM for MongoDB |
| Socket.IO | 4.7 | Real-time bidirectional communication |
| JWT | 9.0 | Authentication tokens |
| bcryptjs | 3.0 | Password hashing |
| web-push | 3.6 | Push notifications (VAPID) |
| @turf/turf | 6.5 | Geospatial calculations |
| express-rate-limit | 8.2 | API rate limiting |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3 | UI framework |
| Vite | 7.2 | Build tool and dev server |
| Tailwind CSS | 3.4 | Utility-first CSS |
| React Router | 6.27 | Client-side routing |
| Socket.IO Client | 4.7 | Real-time communication |
| Axios | 1.6 | HTTP client |
| Leaflet | 1.9 | Interactive maps |
| react-leaflet | 4.2 | React bindings for Leaflet |
| leaflet.pm | 2.2 | Map drawing tools |
| @dnd-kit | 6.3 | Drag-and-drop functionality |
| @turf/turf | 7.3 | Geospatial calculations |
| lucide-react | 0.561 | Icon library |
| framer-motion | 12.23 | Animations |

---

## 4. Features

### 4.1 Core Features

| Feature | Description | Implementation |
|---------|-------------|----------------|
| **Real-Time Tracking** | Live bus location updates every 1-2 seconds | Socket.IO + Geolocation API |
| **ETA Calculation** | Intelligent arrival time estimates | OSRM routing + Haversine fallback |
| **Push Notifications** | Alerts even when app is closed | Web Push API + Service Worker |
| **Route Designer** | Visual route creation with drag-drop stops | Leaflet.pm + @dnd-kit |
| **Fleet Management** | Complete CRUD for buses, drivers, students | REST API + React forms |
| **Dark/Light Theme** | User-selectable theme | CSS variables + Context |

### 4.2 Student Features

- View assigned bus and stop
- Real-time map with bus position
- ETA countdown with color-coded status
- Stop arrival/departure history
- Push notification toggle
- Voice announcement (text-to-speech)
- SOS alert modal

### 4.3 Driver Features

- Start/End trip controls
- Real-time GPS broadcasting
- Simulation mode (map click to teleport)
- SOS emergency broadcast
- Offline location buffering
- Debug log for troubleshooting
- Connection status indicators

### 4.4 Admin Features

- Dashboard with fleet statistics
- Active trips monitoring
- Recent events timeline
- SOS alert notifications
- Bus management (CRUD)
- Driver management (CRUD)
- Route designer with map
- Stop management
- Student management
- Student-to-bus assignment

---

## 5. User Roles

### 5.1 Admin Role

**Capabilities:**
- Full system access
- Create/edit/delete all entities
- View all active trips
- Monitor SOS alerts
- Clear event history

**Default Account:** `ad1 / ad1`

### 5.2 Driver Role

**Capabilities:**
- Start and end trips
- Broadcast location
- Send SOS alerts
- View assigned bus info
- Use simulation mode

**Default Account:** `dr1 / dr1`

### 5.3 Student Role

**Capabilities:**
- View assigned bus/stop
- Track bus in real-time
- Receive push notifications
- View ETA and status
- Enable/disable notifications

**Account Creation:** Admin creates student with roll number (password defaults to roll number)

---

## 6. Database Schema

### 6.1 User Model

```javascript
{
  username: String (required, unique),      // Login identifier
  password: String (required),              // Bcrypt hashed
  role: Enum ['admin', 'driver', 'student'],
  name: String,                             // Display name
  phone: String,                            // Contact number
  assignedBusId: ObjectId → Bus,            // For drivers
  pushSubscription: Object,                 // Web Push subscription
  location: { lat: Number, lng: Number }    // Student's stop location
}
```

### 6.2 Bus Model

```javascript
{
  name: String (required),                  // Bus display name
  numberPlate: String (required, unique),   // License plate
  capacity: Number (default: 40),           // Passenger capacity
  driver: ObjectId → User,                  // Assigned driver
  route: ObjectId → Route,                  // Assigned route
  isActive: Boolean (default: true),        // Active status
  lastLocation: { lat, lng, updatedAt }     // Last GPS position
}
```

### 6.3 Route Model

```javascript
{
  name: String (required),                  // Route name
  geojson: {                                // GeoJSON LineString
    type: 'LineString',
    coordinates: [[lng, lat], ...]
  },
  stops: [{                                 // Embedded stops
    name: String,
    lat: Number,
    lng: Number,
    seq: Number                             // Sequence order
  }],
  segmentStats: [{                          // Historical timing
    fromSeq: Number,
    toSeq: Number,
    avgDurationSec: Number,
    sampleCount: Number
  }]
}
```

### 6.4 Stop Model

```javascript
{
  name: String (required),
  lat: Number (required),
  lng: Number (required),
  seq: Number (required),                   // Order in route
  route: ObjectId → Route,                  // Parent route
  estimatedArrivalMinutes: Number (default: 2)
}
```

### 6.5 Trip Model

```javascript
{
  bus: ObjectId → Bus (required),
  driver: ObjectId → User (required),
  route: ObjectId → Route (required),
  status: Enum ['PENDING', 'ONGOING', 'COMPLETED'],
  currentStopIndex: Number (default: 0),
  startedAt: Date,
  endedAt: Date,
  lastLocation: { lat, lng, accuracy, speed, heading, timestamp },
  locations: [{                             // GPS breadcrumb trail
    lat, lng, accuracy, speed, heading, timestamp
  }]  // Limited to 1000 entries
}
```

### 6.6 StopEvent Model

```javascript
{
  trip: ObjectId → Trip (required),
  stop: ObjectId → Stop,
  stopIndex: Number (required),
  stopName: String (required),
  eventType: Enum ['ARRIVED', 'LEFT', 'SOS'],
  message: String,                          // SOS message
  timestamp: Date,
  location: { lat, lng },
  detectionType: Enum ['auto', 'manual'],
  etaAtEvent: Number
}
```

### 6.7 StudentAssignment Model

```javascript
{
  student: ObjectId → User (required),
  bus: ObjectId → Bus (required),
  stop: ObjectId → Stop (required),
  pushToken: String                         // For notifications
}
// Compound index on (student, bus)
```

### Entity Relationships

```
User (driver) ←──────────→ Bus ←──────────→ Route
     ↑                      ↑                  ↑
     │                      │                  │
     │               StudentAssignment         │
     │                      ↑                  │
     │                      │                  │
User (student) ←────────────┴──────────→ Stop ─┘
     
Trip ←── StopEvent
  ↑
  │
Bus, Driver, Route
```

---

## 7. Backend API

### 7.1 Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/login` | Authenticate user, get JWT | No |
| GET | `/me` | Get current user profile | Yes |
| PUT | `/profile` | Update profile/password | Yes |

### 7.2 Admin Routes (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/assign` | Create student assignment |
| GET | `/assignments` | List all assignments |
| PUT | `/assignments/:id` | Update assignment |
| DELETE | `/assignments/:id` | Delete assignment |
| GET | `/trips` | Get all active trips |
| GET | `/events` | Get recent stop events |
| GET | `/stats` | Get dashboard statistics |
| DELETE | `/events` | Clear all events |

### 7.3 Bus Routes (`/api/buses`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create new bus |
| GET | `/` | List all buses |
| PUT | `/:id` | Update bus |
| DELETE | `/:id` | Delete bus |

### 7.4 Driver Routes (`/api/driver`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create driver account |
| GET | `/` | List all drivers |
| PUT | `/:id` | Update driver |
| DELETE | `/:id` | Delete driver |
| GET | `/trip/active` | Get active trip |
| GET | `/bus` | Get assigned bus |

### 7.5 Route Routes (`/api/routes`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create route with stops |
| GET | `/` | List all routes |
| PUT | `/:id` | Update route and stops |
| DELETE | `/:id` | Delete route (cascade) |

### 7.6 Stop Routes (`/api/stops`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create stop |
| GET | `/route/:routeId` | Get stops for route |
| PUT | `/:id` | Update stop |
| DELETE | `/:id` | Delete stop |

### 7.7 Trip Routes (`/api/trips`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/start` | Start new trip |
| GET | `/active` | Get driver's active trip |
| POST | `/:tripId/end` | End trip |
| DELETE | `/history/today` | Clear today's trips |

### 7.8 Student Routes (`/api/student`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/assignment` | Get student's assignment |
| GET | `/eta` | Get ETA to assigned stop |
| POST | `/push-token` | Save push subscription |
| GET | `/trip` | Get active trip details |

### 7.9 Notification Routes (`/api/notifications`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/subscribe` | Save push subscription |
| POST | `/send` | Send push notification |
| POST | `/test-push` | Test notification |

---

## 8. Frontend Structure

### 8.1 Pages

| Page | Route | Role | Purpose |
|------|-------|------|---------|
| Login | `/login` | All | Authentication |
| AdminDashboard | `/admin` | Admin | Fleet overview |
| ManageBuses | `/admin/buses` | Admin | Bus CRUD |
| ManageDrivers | `/admin/drivers` | Admin | Driver CRUD |
| ManageRoutes | `/admin/routes` | Admin | Route designer |
| ManageStops | `/admin/stops` | Admin | Stop management |
| ManageStudents | `/admin/students` | Admin | Student CRUD |
| AssignStudents | `/admin/assignments` | Admin | Assignments |
| DriverDashboard | `/driver` | Driver | Trip control |
| StudentDashboard | `/student` | Student | Bus tracking |
| Profile | `/profile` | All | User settings |
| DriverSimulator | `/simulator` | Dev | Testing tool |

### 8.2 Components

| Component | Purpose |
|-----------|---------|
| Navbar | Main navigation + theme toggle |
| Drawer | Slide-in panel for forms |
| ConfirmDialog | Confirmation modal |
| MapEditor | Route drawing + stop placement |
| MapView | Simple map display |
| DriverMap | Driver position + route display |
| StudentMap | Animated bus tracking |
| BusCard | Bus info display |
| Toast | Notification messages |
| NotificationToggle | Push notification control |
| ProtectedRoute | Route guard for auth |
| TrackingControls | Driver control panel |

### 8.3 Hooks

| Hook | Purpose |
|------|---------|
| useAuth | Access AuthContext |
| useSocket | Socket.IO connection with offline buffering |
| useGeolocation | GPS tracking with throttling |

### 8.4 Context

| Context | Purpose |
|---------|---------|
| AuthContext | User session management |
| ThemeContext | Dark/light theme switching |

### 8.5 Utils

| Utility | Purpose |
|---------|---------|
| api.js | Axios instance with interceptors |
| etaUtils.js | ETA calculation and formatting |
| mapUtils.js | GeoJSON and map utilities |
| notifications.js | Push notification registration |

---

## 9. Real-Time Communication

### 9.1 Socket.IO Events

#### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `bus:location_update` | `{busId, lat, lng, speed, heading, timestamp}` | GPS update |
| `bus:trip_started` | `{busId, tripId, message}` | New trip notification |
| `trip:stop_arrived` | `{tripId, stopIndex, stopName, timestamp}` | Bus arrived at stop |
| `trip:stop_left` | `{tripId, stopIndex, stopName, timestamp}` | Bus left stop |
| `trip:location_update` | `{tripId, lat, lng, ...}` | Trip location update |
| `trip:eta_update` | `{tripId, etas: {...}}` | ETA updates |
| `driver:sos` | `{tripId, location, message}` | Emergency alert |
| `stats:live_visitors` | `count` | Connected users count |
| `admin:trip_update` | `{tripId, ...}` | Admin dashboard update |

#### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `driver:location_update` | `{driverId, tripId, busId, lat, lng, ...}` | GPS from driver |
| `driver:sos` | `{tripId, location, message}` | Emergency broadcast |
| `join_bus_room` | `{busId}` | Subscribe to bus updates |
| `leave_bus_room` | `{busId}` | Unsubscribe |

### 9.2 Offline Buffering

The `useSocket` hook implements:
- Location updates buffered when offline
- Auto-flush when connection restored
- Retry logic with exponential backoff
- Throttling (minimum 1 second between updates)

---

## 10. ETA Calculation Engine

### 10.1 Primary Method: OSRM Routing

```javascript
// Uses Open Source Routing Machine for road-based distances
const osrmUrl = `http://router.project-osrm.org/table/v1/driving/${coordinates}`;
// Returns actual driving durations between all stops
// Cached for 15 seconds
```

### 10.2 Fallback Method: Haversine + Speed

```javascript
// When OSRM times out (>1.5s) or fails
const distance = haversineDistance(busLat, busLng, stopLat, stopLng);
const eta = distance / assumedSpeed; // ~18 km/h conservative estimate
```

### 10.3 ETA Smoothing

```javascript
// Exponential smoothing to prevent jumpy ETAs
const smoothedETA = alpha * newETA + (1 - alpha) * previousETA;
// Alpha = 0.25 (25% weight to new reading)
```

### 10.4 Segment Statistics

Historical travel times are tracked:
```javascript
segmentStats: [{
  fromSeq: 0,
  toSeq: 1,
  avgDurationSec: 120,
  sampleCount: 15
}]
// Updated with alpha=0.15 smoothing on each trip
```

---

## 11. Push Notifications

### 11.1 VAPID Web Push

- Uses VAPID (Voluntary Application Server Identification)
- Requires public/private key pair
- Works even when browser is closed

### 11.2 Service Worker (sw.js)

```javascript
// Handles push events
self.addEventListener('push', (event) => {
  // Parse notification data
  // Show notification with vibration pattern
  // SOS alerts have distinct vibration
});

// Handles notification clicks
self.addEventListener('notificationclick', (event) => {
  // Focus existing window or open new one
});
```

### 11.3 Notification Types

| Type | Trigger | Vibration | Persistence |
|------|---------|-----------|-------------|
| Bus Arriving | ETA < threshold | Short | Normal |
| Bus Arrived | Stop arrival | Medium | Normal |
| SOS Alert | Driver emergency | Long pattern | requireInteraction |

---

## 12. PWA Features

### 12.1 Manifest (manifest.json)

```json
{
  "name": "TrackMate",
  "short_name": "TrackMate",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0B7CFF",
  "theme_color": "#0B7CFF",
  "icons": [
    {"src": "/icon-192.png", "sizes": "192x192"},
    {"src": "/icon-512.png", "sizes": "512x512"}
  ]
}
```

### 12.2 Installable App

- Add to Home Screen prompt
- Standalone display mode
- Custom splash screen
- Native-like experience

### 12.3 Offline Capabilities

- Service Worker caches critical assets
- Location updates buffered offline
- Auto-sync when online

---

## 13. Security

### 13.1 Authentication

- JWT tokens with 12-hour expiration
- Bcrypt password hashing (auto-migration from plain text)
- Token stored in sessionStorage (clears on browser close)

### 13.2 Authorization

- Role-based middleware (`roleMiddleware`)
- Protected routes on frontend (`ProtectedRoute`)
- API endpoints check user role

### 13.3 Rate Limiting

```javascript
// Login endpoint: 10 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10
});
```

### 13.4 Input Validation

- MongoDB ObjectId validation
- Coordinate range validation
- Required field checks

### 13.5 Error Handling

- Global error handler
- Production mode hides stack traces
- Unhandled rejection logging

---

## 14. Configuration

### 14.1 Backend Environment Variables

```properties
# Required
PORT=5000
MONGO_URI=mongodb://localhost:27017/trackmate
JWT_SECRET=your_super_secret_jwt_key

# Optional
DB_NAME=TrackMatev1
CLIENT_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
NODE_ENV=development

# Push Notifications
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
```

### 14.2 Backend Constants

```javascript
// config/constants.js
RADIUS_METERS: 1000,           // Stop detection radius
LEAVE_RADIUS_METERS: 80,       // Leave detection radius
MIN_UPDATE_INTERVAL_MS: 1000,  // GPS throttle
ETA_ALPHA: 0.25,               // ETA smoothing factor
SEG_ALPHA: 0.15,               // Segment stats smoothing
MIN_SPEED_MPS: 0.8,            // Minimum valid speed
ASSUMED_SPEED_MPS: 5,          // Default speed (~18 km/h)
DEFAULT_SEG_SEC: 120,          // Default segment duration
OSRM_CACHE_TTL_MS: 15000       // OSRM cache lifetime
```

### 14.3 Frontend Configuration

```javascript
// constants/api.js
DEPLOYED_BASE_URL: 'https://trackmate-backend-ew4v.onrender.com'
LOCAL_BASE_URL: 'http://localhost:5000'

// constants/geo.js
ELURU_CENTER: { lat: 16.7107, lng: 81.0952 }
DEFAULT_MAP_ZOOM: 10
TILE_LAYER_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
```

---

## 15. Deployment

### 15.1 Backend Deployment (Render.com)

1. Create Web Service
2. Connect GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables
6. Deploy

### 15.2 Frontend Deployment (Vercel)

```json
// vercel.json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

1. Connect GitHub repository
2. Set framework: Vite
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Deploy

### 15.3 Database (MongoDB Atlas)

1. Create cluster
2. Create database user
3. Whitelist IP addresses
4. Get connection string
5. Set MONGO_URI environment variable

---

## 16. File Structure

```
TrackMate/
├── README.md
├── DEV_GUIDE.md
├── PROJECT_DOCUMENTATION.md
├── vercel.json
│
├── backend/
│   ├── server.js                    # Main entry point
│   ├── package.json
│   ├── seed.js                      # Database seeder
│   │
│   ├── config/
│   │   ├── constants.js             # App constants
│   │   └── db.js                    # MongoDB connection
│   │
│   ├── controllers/
│   │   ├── authController.js        # Authentication
│   │   ├── adminController.js       # Admin operations
│   │   ├── busController.js         # Bus CRUD
│   │   ├── driverController.js      # Driver operations
│   │   ├── routeController.js       # Route CRUD
│   │   ├── stopController.js        # Stop CRUD
│   │   ├── studentController.js     # Student operations
│   │   ├── tripController.js        # Trip lifecycle
│   │   ├── locationController.js    # Real-time GPS
│   │   ├── eventController.js       # Stop events
│   │   └── notificationController.js # Push notifications
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js        # JWT validation
│   │   └── roleMiddleware.js        # Role checking
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Bus.js
│   │   ├── Route.js
│   │   ├── Stop.js
│   │   ├── Trip.js
│   │   ├── StopEvent.js
│   │   └── StudentAssignment.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── adminRoutes.js
│   │   ├── busRoutes.js
│   │   ├── driverRoutes.js
│   │   ├── routeRoutes.js
│   │   ├── stopRoutes.js
│   │   ├── studentRoutes.js
│   │   ├── tripRoutes.js
│   │   ├── eventRoutes.js
│   │   └── notificationRoutes.js
│   │
│   ├── utils/
│   │   ├── etaCalculator.js         # ETA logic
│   │   ├── geoUtils.js              # Geospatial math
│   │   ├── notificationService.js   # Push utilities
│   │   └── segmentStats.js          # Historical timing
│   │
│   └── inMemory/
│       └── activeTrips.js           # Trip state cache
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vercel.json
│   │
│   ├── public/
│   │   ├── manifest.json            # PWA manifest
│   │   ├── sw.js                    # Service Worker
│   │   └── markers/
│   │       ├── bus.png
│   │       ├── stop.png
│   │       └── location.png
│   │
│   └── src/
│       ├── App.jsx                  # Root component
│       ├── main.jsx                 # Entry + routing
│       ├── index.css                # Global styles
│       │
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── Drawer.jsx
│       │   ├── ConfirmDialog.jsx
│       │   ├── MapEditor.jsx
│       │   ├── MapView.jsx
│       │   ├── DriverMap.jsx
│       │   ├── StudentMap.jsx
│       │   ├── BusCard.jsx
│       │   ├── Toast.jsx
│       │   ├── NotificationToggle.jsx
│       │   ├── ProtectedRoute.jsx
│       │   └── TrackingControls.jsx
│       │
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── AdminDashboard.jsx
│       │   ├── DriverDashboard.jsx
│       │   ├── StudentDashboard.jsx
│       │   ├── ManageBuses.jsx
│       │   ├── ManageDrivers.jsx
│       │   ├── ManageRoutes.jsx
│       │   ├── ManageStops.jsx
│       │   ├── ManageStudents.jsx
│       │   ├── AssignStudents.jsx
│       │   ├── Profile.jsx
│       │   └── DriverSimulator.jsx
│       │
│       ├── hooks/
│       │   ├── useAuth.js
│       │   ├── useSocket.js
│       │   └── useGeolocation.js
│       │
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   └── ThemeContext.jsx
│       │
│       ├── constants/
│       │   ├── api.js
│       │   └── geo.js
│       │
│       ├── utils/
│       │   ├── api.js
│       │   ├── etaUtils.js
│       │   ├── mapUtils.js
│       │   └── notifications.js
│       │
│       └── styles/
│           └── MapEditor.css
│
└── Screenshots/
    ├── driver_dash.png
    ├── god_mode.png
    ├── route_table.png
    └── student_mobile1.jpg
```

---

## Quick Reference

### Default Accounts

| Role | Username | Password |
|------|----------|----------|
| Admin | ad1 | ad1 |
| Driver | dr1 | dr1 |
| Student | (roll number) | (roll number) |

### Key URLs

| Environment | Frontend | Backend |
|-------------|----------|---------|
| Local | http://localhost:5173 | http://localhost:5000 |
| Production | (Your Vercel URL) | https://trackmate-backend-ew4v.onrender.com |

### Commands

```bash
# Backend
cd backend
npm install
npm run dev        # Development with nodemon
npm start          # Production

# Frontend
cd frontend
npm install
npm run dev        # Development with Vite
npm run build      # Production build
npm run preview    # Preview production build
```

---

## License

This project is created for educational purposes as part of a college project.

---

*Last Updated: January 2026*
