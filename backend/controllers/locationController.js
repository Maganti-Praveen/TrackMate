const jwt = require('jsonwebtoken');
const Trip = require('../models/Trip');
const Route = require('../models/Route');
const StopEvent = require('../models/StopEvent');
const Bus = require('../models/Bus');
const { distanceMeters } = require('../utils/geoUtils');
const { advanceToNextStop } = require('./tripController');
const {
  JWT_SECRET,
  RADIUS_METERS,
  SUSTAIN_TIME_MS,
  LEAVE_RADIUS,
  MIN_UPDATE_INTERVAL_MS
} = require('../config/constants');

const activeTrips = new Map();
const driverThrottle = new Map();

const getTripState = async (tripId) => {
  const cacheKey = tripId.toString();
  if (activeTrips.has(cacheKey)) {
    return activeTrips.get(cacheKey);
  }

  const trip = await Trip.findById(tripId);
  if (!trip) return null;
  const route = await Route.findById(trip.route);
  if (!route) return null;

  const state = {
    tripId: cacheKey,
    trip,
    routeStops: [...route.stops].sort((a, b) => a.seq - b.seq),
    currentStopIndex: trip.currentStopIndex || 0,
    insideWindow: {
      stopIndex: trip.currentStopIndex || 0,
      timestamps: [],
      arrivedMarked: false,
      leftMarked: false
    }
  };

  activeTrips.set(cacheKey, state);
  return state;
};

const resetInsideWindow = (state) => {
  state.insideWindow = {
    stopIndex: state.currentStopIndex,
    timestamps: [],
    arrivedMarked: false,
    leftMarked: false
  };
};

const persistStopEvent = async ({ tripId, stopIndex, stopName, status, location, source }) => {
  return StopEvent.create({
    trip: tripId,
    stopIndex,
    stopName,
    status,
    location,
    source
  });
};

const updateBusLocation = async (busId, coords) => {
  await Bus.findByIdAndUpdate(busId, {
    lastKnownLocation: { ...coords, updatedAt: new Date() }
  });
};

const handleDriverLocationUpdate = async (io, socket, payload) => {
  if (!socket.user) {
    socket.emit('auth:error', { message: 'Socket not authenticated' });
    return;
  }

  const { driverId, tripId, busId, lat, lng, timestamp } = payload || {};
  if (!tripId || !lat || !lng) {
    return;
  }

  const driverKey = driverId || socket.user.id;
  const now = Date.now();
  const lastPing = driverThrottle.get(driverKey) || 0;
  if (now - lastPing < MIN_UPDATE_INTERVAL_MS) {
    return;
  }
  driverThrottle.set(driverKey, now);

  const state = await getTripState(tripId);
  if (!state) {
    socket.emit('trip:error', { message: 'Trip not found for tracking' });
    return;
  }

  const room = `trip_${tripId}`;
  socket.join(room);

  await updateBusLocation(state.trip.bus, { lat, lng });

  const nextStop = state.routeStops[state.currentStopIndex];
  if (nextStop) {
    const distance = distanceMeters({ lat, lng }, { lat: nextStop.lat, lng: nextStop.lng });

    if (distance <= RADIUS_METERS) {
      state.insideWindow.timestamps.push(now);
      state.insideWindow.timestamps = state.insideWindow.timestamps.filter(
        (ts) => now - ts <= SUSTAIN_TIME_MS
      );

      if (!state.insideWindow.arrivedMarked) {
        const firstTs = state.insideWindow.timestamps[0];
        if (firstTs && now - firstTs >= SUSTAIN_TIME_MS) {
          state.insideWindow.arrivedMarked = true;
          const event = await persistStopEvent({
            tripId,
            stopIndex: nextStop.seq,
            stopName: nextStop.name,
            status: 'ARRIVED',
            location: { lat, lng },
            source: 'auto'
          });
          io.to(room).emit('trip:stop_arrived', {
            tripId,
            stopIndex: event.stopIndex,
            stopName: event.stopName,
            timestamp: event.timestamp
          });
        }
      }
    } else {
      state.insideWindow.timestamps = [];
      if (
        state.insideWindow.arrivedMarked &&
        !state.insideWindow.leftMarked &&
        distance >= LEAVE_RADIUS
      ) {
        state.insideWindow.leftMarked = true;
        const event = await persistStopEvent({
          tripId,
          stopIndex: nextStop.seq,
          stopName: nextStop.name,
          status: 'LEFT',
          location: { lat, lng },
          source: 'auto'
        });
        io.to(room).emit('trip:stop_left', {
          tripId,
          stopIndex: event.stopIndex,
          stopName: event.stopName,
          timestamp: event.timestamp
        });
        const updatedTrip = await advanceToNextStop(tripId);
        state.currentStopIndex = updatedTrip?.currentStopIndex || state.currentStopIndex + 1;
        resetInsideWindow(state);
      }
    }
  }

  io.to(room).emit('trip:location_update', {
    tripId,
    busId: busId || state.trip.bus,
    lat,
    lng,
    timestamp: timestamp || Date.now()
  });
};

const handleManualEvent = async (io, socket, payload) => {
  if (!socket.user) {
    return;
  }
  const { tripId, stopIndex, status, lat, lng } = payload || {};
  if (!tripId || typeof stopIndex !== 'number' || !status) {
    return;
  }

  const state = await getTripState(tripId);
  if (!state) {
    return;
  }
  const matchingStop = state.routeStops.find((stop) => stop.seq === stopIndex);
  if (!matchingStop) {
    return;
  }

  const event = await persistStopEvent({
    tripId,
    stopIndex,
    stopName: matchingStop.name,
    status,
    location: { lat, lng },
    source: 'manual'
  });

  if (status === 'ARRIVED') {
    state.currentStopIndex = state.routeStops.findIndex((stop) => stop.seq === stopIndex);
    state.insideWindow = {
      stopIndex,
      timestamps: [],
      arrivedMarked: true,
      leftMarked: false
    };
  } else if (status === 'LEFT') {
    state.insideWindow.leftMarked = true;
    const updatedTrip = await advanceToNextStop(tripId);
    state.currentStopIndex = updatedTrip?.currentStopIndex || state.currentStopIndex + 1;
    resetInsideWindow(state);
  }

  const room = `trip_${tripId}`;
  io.to(room).emit(
    status === 'ARRIVED' ? 'trip:stop_arrived' : 'trip:stop_left',
    {
      tripId,
      stopIndex: event.stopIndex,
      stopName: event.stopName,
      timestamp: event.timestamp,
      manual: true
    }
  );
};

const registerLocationHandlers = (io) => {
  io.on('connection', (socket) => {
    const authTimeout = setTimeout(() => {
      if (!socket.user) {
        socket.disconnect(true);
      }
    }, 5000);

    socket.on('auth:token', ({ token }) => {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.user = decoded;
        socket.emit('auth:ready');
      } catch (error) {
        socket.emit('auth:error', { message: 'Invalid token' });
        socket.disconnect(true);
      }
    });

    socket.on('driver:location_update', (payload) =>
      handleDriverLocationUpdate(io, socket, payload)
    );
    socket.on('driver:manual_event', (payload) => handleManualEvent(io, socket, payload));

    socket.on('disconnect', () => {
      clearTimeout(authTimeout);
    });
  });
};

module.exports = { registerLocationHandlers };
