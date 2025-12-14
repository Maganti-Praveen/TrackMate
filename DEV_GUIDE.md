# TrackMate Developer Guide

This guide covers the specialized workflows for developing and testing TrackMate's unique features, specifically "God Mode," the Route Lab, and mobile push notifications.

---

## 🛠️ Testing "God Mode"

"God Mode" allows you to simulate bus movement without physically driving a vehicle. This is controlled entirely from the Frontend Driver Dashboard.

### How to use:
1.  **Login** as a Driver.
2.  Navigate to the **Driver Dashboard**.
3.  Click the **"Start Trip"** button to initialize a session in the backend.
4.  Toggle the **"🛠️ Enable Sim"** button in the top right. It should change to **"God Mode ON"**.
5.  **Click anywhere on the map**.
    *   The bus marker will instantly "teleport" to that location.
    *   The backend will treat this as a valid GPS ping with `speed: 30` and `accuracy: 5`.
    *   Arrival/Departure logic will trigger immediately if you land inside a stop's radius.

> **Tip:** Use `DriverSimulator.jsx` (accessible via `/simulator` route if enabled) for automated looping through the "Eluru Sim Path" coordinates.

---

## 🧪 Route Lab Workflow

The "Route Lab" (`ManageRoutes.jsx`) is a complex UI interaction utilizing **React Portals**. The map canvas is in the main view, but the stop list is rendered into the sidebar via a portal.

### Key Interactions:
1.  **Drawing**: Use the Leaflet draw tools (top-left of map) to draw a **Polyline**.
2.  **Adding Stops**: Click physically on the Polyline you just drew. A new marker will appear.
3.  **Reordering**:
    *   Look at the Sidebar. The stop you added appears there.
    *   Drag and drop the stop cards to reorder the sequence.
    *   **Note**: This uses `@dnd-kit`. When you drop a card, the route line on the map is *not* redrawn automatically to match the new order (this is a known optimization to prevent jagged lines), but the logical sequence is updated.

---

## 📱 Mobile Debugging

Testing Service Workers (`sw.js`) on mobile can be tricky because the OS aggressively caches the worker file.

### Service Worker Hard Reload
If you change `sw.js` and don't see updates on your phone:
1.  **Close all tabs** of TrackMate.
2.  **Kill the Browser App** (swipe it away from recent apps).
3.  **Re-open the App**. The browser should detect the byte difference in `sw.js` and install the new one.

### The "White Badge" (Android)
*   **Symptom**: You see a notification square but it's just a white block.
*   **Fix**: Android requires the "Badge" icon (small icon) to be **transparent with white pixels only**.
*   **Check**: Verify `public/markers/location.png` is used as the `badge` property in `sw.js`. If it has colors, Android will mask it to a white square.

---

## 🔌 Socket Events Reference

Use this reference when debugging WebSocket messages in the Chrome Network tab.

### 📤 Client Emits (From Frontend)

| Event | Payload | Description |
| :--- | :--- | :--- |
| `driver:location_update` | `{ tripId, lat, lng, speed, heading }` | The main heartbeat of the tracking system. |
| `driver:manual_event` | `{ tripId, stopIndex, status: 'ARRIVED'\|'LEFT' }` | Manually triggering stop logic (backup to GPS). |
| `student:subscribe` | `{ tripId }` | Student joining a specific bus room to get updates. |

### 📥 Client Receives (From Backend)

| Event | Payload | Description |
| :--- | :--- | :--- |
| `trip:location_update` | `{ lat, lng, timestamp }` | The echoed position for live map movement. |
| `trip:eta_update` | `{ etas: [{ stopName, seconds }] }` | Updated predictions based on traffic/OSRM. |
| `trip:stop_arrived` | `{ stopName, stopIndex }` | Triggers the "Bus has arrived" toast/notification. |
