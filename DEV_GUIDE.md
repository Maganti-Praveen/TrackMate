# TrackMate Developer Guide

This guide covers the specialized workflows for developing and testing TrackMate's unique features, specifically "God Mode," the Route Lab, and mobile push notifications.

---

## 🛠️ Testing "God Mode"

"God Mode" allows you to simulate bus movement without physically driving a vehicle. This is controlled entirely from the Frontend Driver Dashboard.

### How to use

1. **Login** as a Driver.
2. Navigate to the **Driver Dashboard**.
3. Click the **"Start Trip"** button to initialize a session in the backend.
4. Toggle the **"🛠️ Enable Sim"** button in the top right. It should change to **"God Mode ON"**.
5. **Click anywhere on the map**.
    * The bus marker will instantly "teleport" to that location.
    * The backend will treat this as a valid GPS ping with `speed: 30` and `accuracy: 5`.
    * Arrival/Departure logic will trigger immediately if you land inside a stop's radius.

> **Tip:** Use `DriverSimulator.jsx` (accessible via `/simulator` route if enabled) for automated looping through the "Eluru Sim Path" coordinates.

---

## 🧪 Route Lab Workflow

The "Route Lab" (`ManageRoutes.jsx`) is a complex UI interaction utilizing **React Portals**. The map canvas is in the main view, but the stop list is rendered into the sidebar via a portal.

### Key Interactions

1. **Drawing**: Use the Leaflet draw tools (top-left of map) to draw a **Polyline**.
2. **Adding Stops**: Click physically on the Polyline you just drew. A new marker will appear.
3. **Reordering**:
    * Look at the Sidebar. The stop you added appears there.
    * Drag and drop the stop cards to reorder the sequence.
    * **Note**: This uses `@dnd-kit`. When you drop a card, the route line on the map is *not* redrawn automatically to match the new order (this is a known optimization to prevent jagged lines), but the logical sequence is updated.

---

## 🚨 Testing SOS Panic Mode

The SOS feature involves a multi-socket broadcast loop.

1. **Driver Side**: Click the **Red SOS Button**. Confirm the dialog.
    * *Expected behavior*: "SOS Sent" toast appears.
2. **Student Side**:
    * **In App**: A full-screen Red Modal should overlay the map immediately.
    * **System Notification**: If the app is minimized, a "🚨 EMERGENCY ALERT" notification should appear in the OS tray.

---

## 📱 Mobile Debugging & Push Notifications

Testing Service Workers (`sw.js`) on mobile can be tricky because the OS aggressively caches the worker file.

### Service Worker Hard Reload

If you change `sw.js` and don't see updates on your phone:

1. **Close all tabs** of TrackMate.
2. **Kill the Browser App** (swipe it away from recent apps).
3. **Re-open the App**. The browser should detect the byte difference in `sw.js` and install the new one.

### VAPID Keys & Subscriptions

If notifications fail with `401/403` or "Invalid Key":

1. Check `backend/keys.json` explicitly.
2. Ensure `frontend/StudentDashboard.jsx` has the matching `VAPID_PUBLIC_KEY`.
3. **Reset**: Student should toggle the "Bell" icon OFF and then ON again. This forces a fresh `subscribe()` call with the new key.

### The "White Badge" (Android)

* **Symptom**: You see a notification square but it's just a white block.
* **Fix**: Android requires the "Badge" icon (small icon) to be **transparent with white pixels only**.
* **Check**: Verify `public/markers/location.png` is used as the `badge` property in `sw.js`. If it has colors, Android will mask it to a white square.

---

## 🔌 Socket Events Reference

Use this reference when debugging WebSocket messages in the Chrome Network tab.

### 📤 Client Emits (From Frontend)

| Event | Payload | Description |
| :--- | :--- | :--- |
| `driver:location_update` | `{ tripId, lat, lng, speed, heading }` | The main heartbeat of the tracking system. |
| `driver:sos` | `{ tripId, message }` | **(NEW)** Triggers emergency broadcast. |
| `driver:manual_event` | `{ tripId, stopIndex, status: 'ARRIVED'\|'LEFT' }` | Manually triggering stop logic (backup to GPS). |
| `student:subscribe` | `{ tripId }` | Student joining a specific bus room to get updates. |

### 📥 Client Receives (From Backend)

| Event | Payload | Description |
| :--- | :--- | :--- |
| `trip:location_update` | `{ lat, lng, timestamp }` | The echoed position for live map movement. |
| `trip:eta_update` | `{ etas: [{ stopName, seconds }] }` | Updated predictions based on traffic/OSRM. |
| `trip:stop_arrived` | `{ stopName, stopIndex }` | Triggers the "Bus has arrived" toast/notification. |

---

## 🚀 Deployment Guide (Render)

This guide walks you through deploying **TrackMate** (Backend & Frontend) to Render for free.

### 1. Backend (Web Service)

1. **New Web Service** -> Connect Repo -> Root Dir: `backend`.
2. **Environment Variables**:
    * `MONGO_URI`: Your MongoDB connection string.
    * `JWT_SECRET`: A long random string.
    * `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`: Your web push keys.
    * `CLIENT_URL`: Your future frontend URL (e.g. `https://trackmate-frontend.onrender.com`).
3. **Deploy**.

### 2. Frontend (Static Site)

1. **New Static Site** -> Connect Repo -> Root Dir: `frontend`.
2. **Build Command**: `npm install && npm run build`.
3. **Publish Directory**: `dist`.
4. **Environment Variables**:
    * `VITE_API_URL`: Your Backend URL (e.g. `https://trackmate-backend.onrender.com`).
5. **Rewrites**: Source `/*` -> Dest `/index.html` (Rewrite).
6. **Deploy**.

---

## 🧪 Backend Smoke Tests

Follow this script to prove the critical backend flows (auth, routes, trips, sockets, geofence automation) still work after changes.

### 1. Install & Seed

1. `cd backend`
2. `npm install`
3. `npm run seed` – copy the printed JWT tokens for ad1/dr1/22ME1A0501.

### 2. Authenticate & Start Trip

```bash
# Login Driver
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"dr1","password":"dr1"}'

# Start Trip (using token)
curl -X POST http://localhost:5000/api/trips/start \
   -H "Authorization: Bearer <DRIVER_TOKEN>" \
   -H "Content-Type: application/json" \
   -d '{"busId":"<BUS_ID>"}'
```

### 3. SOS Panic Test (Critical Safety)

1. Start a trip as Driver (`dr1`).
2. **Trigger via Socket (Frontend Method)**:
    * Click **"🚨 SOS PANIC"** in dashboard -> confirm.
    * Expect: `trip:sos` event broadcast to all clients in `trip_<ID>`.
3. **Verify Backend Log**:
    * Should see: `[SOS] Received from Driver...`
    * Should see: `[SOS] Found N students to alert.`
    * Should see: `[SOS] Sent push to M/N students.`
4. **Verify Student UI**:
    * Full screen Red Modal should appear.
    * System notification "🚨 EMERGENCY ALERT" should arrive.
