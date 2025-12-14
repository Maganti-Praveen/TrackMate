/* eslint-disable no-console */
const { io } = require('socket.io-client');

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:5000';
const TEST_TOKEN = process.env.TEST_TOKEN;
const TEST_TRIP_ID = process.env.TEST_TRIP_ID;

if (!TEST_TOKEN || !TEST_TRIP_ID) {
  console.error('Set TEST_TOKEN and TEST_TRIP_ID env vars (use values from seed output).');
  process.exit(1);
}

const pathPoints = [
  { lat: 17.4465, lng: 78.3495 }, // before stop 0
  { lat: 17.44712, lng: 78.34883 }, // North Gate
  { lat: 17.444, lng: 78.3535 },
  { lat: 17.44297, lng: 78.35619 }, // Library Circle
  { lat: 17.4395, lng: 78.3615 },
  { lat: 17.4386, lng: 78.36571 } // Metro Station
];

const socket = io(SOCKET_URL, {
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('🔌 Connected to socket test server');
  socket.emit('auth:token', { token: TEST_TOKEN });
});

socket.on('auth:ready', () => {
  console.log('✅ Authenticated. Starting location simulation.');
  socket.emit('student:subscribe', { tripId: TEST_TRIP_ID });
  emitNextPoint(0);
});

socket.on('auth:error', (payload) => console.error('Auth error', payload));

socket.on('trip:eta_update', (payload) => {
  console.log('📡 ETA update:', JSON.stringify(payload));
});

socket.on('trip:stop_arrived', (payload) => console.log('🛑 Arrived', payload));

socket.on('trip:stop_left', (payload) => console.log('▶️ Left', payload));

socket.on('trip:location_update', (payload) => console.log('📍 Location echo', payload));

const emitNextPoint = (index) => {
  if (index >= pathPoints.length) {
    console.log('✅ Simulation complete. Press Ctrl+C to exit.');
    return;
  }
  const point = pathPoints[index];
  console.log(`➡️  Emitting point ${index + 1}/${pathPoints.length}`, point);
  socket.emit('driver:location_update', {
    tripId: TEST_TRIP_ID,
    lat: point.lat,
    lng: point.lng,
    speed: 7
  });

  setTimeout(() => emitNextPoint(index + 1), 4000);
};

socket.on('disconnect', () => console.log('Socket disconnected.'));
