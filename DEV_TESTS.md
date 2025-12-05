# TrackMate Backend Smoke Tests

Follow this script to prove the critical backend flows (auth, routes, trips, sockets, geofence automation) still work after changes.

## 1. Install & Seed

1. `cd backend`
2. `npm install`
3. `npm run seed` – copy the printed JWT tokens for ad1/dr1/22ME1A0501/22ME1A0502.

## 2. Authenticate & Fetch Profile

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ad1","password":"ad1"}'
```

- Expect `{ token, user }` where `user.assignedBusId` is null for admins.
- Repeat for `dr1` and verify the payload includes `assignedBusId` so the driver UI can read the correct bus.

## 3. Routes API

1. Use the admin token from step 2.
2. `curl -X POST http://localhost:5000/api/routes \
   -H "Authorization: Bearer <ADMIN_TOKEN>" \
   -H "Content-Type: application/json" \
   -d '{"name":"QA Route","geojson":{"type":"LineString","coordinates":[[78.34,17.44],[78.35,17.45]]},"stops":[{"name":"Stop A","lat":17.44,"lng":78.34,"seq":0},{"name":"Stop B","lat":17.45,"lng":78.35,"seq":1}]}'`
3. `curl -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:5000/api/routes` should list both the seeded "Morning Loop A" route and the new QA route.

## 4. Start Trip as Driver

1. Login as `dr1` (step 2) and copy `assignedBusId`.
2. `curl -X POST http://localhost:5000/api/trips/start \
   -H "Authorization: Bearer <DRIVER_TOKEN>" \
   -H "Content-Type: application/json" \
   -d '{"busId":"<BUS_OBJECT_ID_FROM_LOGIN>"}'`
3. Response should be `status: "ONGOING"` with `currentStopIndex: 0`.

## 5. Socket + Geofence Smoke Test

Use Node to simulate GPS updates and confirm auto ARRIVED/LEFT events:

```bash
node <<'NODE'
const { io } = require('socket.io-client');
const socket = io('http://localhost:5000', { transports: ['websocket'] });
const token = '<DRIVER_TOKEN>';
const tripId = '<TRIP_ID_FROM_STEP_4>';
const busId = '<BUS_ID>';

socket.on('connect', () => {
  socket.emit('auth:token', { token });
  const payloads = [
    { lat: 17.4472, lng: 78.3489 },
    { lat: 17.4430, lng: 78.3562 },
    { lat: 17.4387, lng: 78.3658 },
    { lat: 17.4313, lng: 78.3731 }
  ];
  payloads.forEach((coords, idx) => {
    setTimeout(() => {
      socket.emit('driver:location_update', { ...coords, driverId: 'dr1', tripId, busId, timestamp: Date.now() });
    }, idx * 7000);
  });
});

socket.on('trip:location_update', console.log);
socket.on('trip:stop_arrived', (data) => console.log('ARRIVED', data));
socket.on('trip:stop_left', (data) => console.log('LEFT', data));
NODE
```

- Expect the backend to throttle updates faster than 3 s and automatically emit ARRIVED/LEFT events as coordinates move through each stop radius.

## 6. Driver Streaming UI

1. `cd frontend && npm run dev` then open the driver dashboard in a mobile browser or device simulator.
2. Login as `dr1`; confirm the header shows the assigned bus ID.
3. Tap **Start Trip** (hits `/api/trips/start`). Trip ID should appear under “Stream Status”.
4. Tap **Start GPS Stream**. Allow browser geolocation. Status chip should flip to “Tracking Active” and `Pings sent` should increment every ~3 s.
5. Toggle **Simulation** to verify the preloaded Hyderabad path emits positions without real GPS.
6. Force the device offline (airplane mode). The banner should show “Offline” and `Buffered points` should grow while emits are queued.
7. Reconnect networking; buffered points should drain within a few seconds and the debug log should show “Back online” plus server echoes.
8. Tap **End Trip** to hit `/api/trips/:tripId/end` (falls back to `/api/trips/end`). Trip section should reset to “none”.

## 7. Profile Persistence

- `curl -H "Authorization: Bearer <TOKEN>" http://localhost:5000/api/auth/me`
- Ensure the payload mirrors login (including assignments) so the frontend can rehydrate sessionStorage on refresh.

If any step fails, capture the backend logs plus the HTTP/socket payloads before debugging.
