require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { ensureDefaultAccounts } = require('./controllers/authController');
const authRoutes = require('./routes/authRoutes');
const routeRoutes = require('./routes/routeRoutes');
const tripRoutes = require('./routes/tripRoutes');
const adminRoutes = require('./routes/adminRoutes');
const busRoutes = require('./routes/busRoutes');
const driverRoutes = require('./routes/driverRoutes');
const stopRoutes = require('./routes/stopRoutes');
const studentRoutes = require('./routes/studentRoutes');
const eventRoutes = require('./routes/eventRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { registerLocationHandlers } = require('./controllers/locationController');

const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/stops', stopRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (_req, res) => {
  res.json({ message: 'TrackMate backend is running' });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});
app.set('io', io);

// --- Live Visitor Counter ---
let liveVisitorCount = 0;

io.on('connection', (socket) => {
  liveVisitorCount++;
  io.emit('stats:live_visitors', liveVisitorCount);

  socket.on('disconnect', () => {
    liveVisitorCount = Math.max(0, liveVisitorCount - 1);
    io.emit('stats:live_visitors', liveVisitorCount);
  });
});

registerLocationHandlers(io);

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  await ensureDefaultAccounts();
  server.listen(PORT, () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🚍 TrackMate backend listening on port ${PORT}`);
    }
  });
};

start();
