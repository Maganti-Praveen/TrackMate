# TrackMate Backend Dev Tests

Use these lightweight steps to validate the Level-3 ETA engine locally.

## 1. Install & seed
```bash
cd backend
npm install
npm run seed
```
The seed script prints sample JWT tokens and the trip ID for the demo route. Copy the driver token for the socket test.

## 2. Start the server
```bash
npm start
```
Server listens on `http://localhost:5000` by default.

## 3. Run the socket simulator
In another terminal:
```bash
cd backend
TEST_TOKEN="<driver-jwt-from-seed>" \
TEST_TRIP_ID="<trip-id-from-seed>" \
node dev/socket-client-test.js
```
Optional: set `SOCKET_URL` if your backend runs on a different host.

The script connects as a driver, emits a sequence of GPS points, and logs:
- `trip:location_update` echoes
- `trip:stop_arrived` / `trip:stop_left` geofence events
- `trip:eta_update` payloads showing smoothed ETAs and `etasMap`

Inspect MongoDB `routes.segStats` after the run to see updated per-segment averages.
