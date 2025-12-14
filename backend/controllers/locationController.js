const jwt = require('jsonwebtoken');
const StopEvent = require('../models/StopEvent');
const Bus = require('../models/Bus');
const { distanceMeters } = require('../utils/geoUtils');
const { advanceToNextStop } = require('./tripController');
const {
  computeRawEtas,
  smoothEtas,
  etasToArrayOrShape
} = require('../utils/etaCalculator');
const { updateSegmentStats } = require('../utils/segmentStats');
const { getActiveTripState, resetInsideWindow } = require('../inMemory/activeTrips');
const {
  JWT_SECRET,
  RADIUS_METERS,
  SUSTAIN_TIME_MS,
  LEAVE_RADIUS_METERS,
  MIN_UPDATE_INTERVAL_MS,
  ETA_EMIT_DELTA_MS,
  MIN_SPEED_MPS,
  ASSUMED_SPEED_MPS
} = require('../config/constants');

const driverThrottle = new Map();

const persistStopEvent = async ({ tripId, stopIndex, stopName, status, location, source }) =>
  StopEvent.create({
    trip: tripId,
    stopIndex,
    stopName,
    status,
    location,
    source
  });

const updateBusLocation = async (busId, coords) => {
  await Bus.findByIdAndUpdate(busId, {
    lastKnownLocation: { ...coords, updatedAt: new Date() }
  });
};

const pushLocationUpdate = async (tripId, { lat, lng, speed, heading, timestamp }) => {
  const Trip = require('../models/Trip');
  await Trip.findByIdAndUpdate(tripId, {
    $push: {
      locations: {
        lat,
        lng,
        speed: speed || 0,
        heading: heading || 0,
        timestamp: timestamp || new Date()
      }
    },
    $set: {
      lastLocation: { lat, lng, updatedAt: new Date() }
    }
  });
};

const shouldEmitEta = (prevCache = {}, smoothed = {}, thresholdMs, force) => {
  if (force) return true;
  return Object.entries(smoothed).some(([stopId, etaMs]) => {
    const previous = prevCache[stopId];
    if (typeof previous !== 'number') return true;
    return Math.abs(previous - etaMs) > thresholdMs;
  });
};

const emitEtaUpdateIfNeeded = (io, tripId, state, rawEtas, { force = false } = {}) => {
  if (!rawEtas || !Object.keys(rawEtas).length) {
    return false;
  }

  const { prevCache, smoothed } = smoothEtas(state, rawEtas);
  const willEmit = shouldEmitEta(prevCache, smoothed, ETA_EMIT_DELTA_MS, force);
  state.etaCache = { ...prevCache, ...smoothed };
  if (!willEmit) {
    return false;
  }
  state.lastEmitTime = Date.now();
  const payload = etasToArrayOrShape(state.etaCache);
  io.to(`trip_${tripId}`).emit('trip:eta_update', {
    tripId,
    etas: payload.array,
    etasMap: payload.map
  });
  return true;
};

const computeSpeedMps = (state, position, providedSpeed, now) => {
  if (typeof providedSpeed === 'number' && providedSpeed > 0) {
    return providedSpeed;
  }
  const lastPosition = state.lastPosition;
  if (lastPosition?.timestamp) {
    const distance = distanceMeters(lastPosition, position);
    const deltaSeconds = (now - lastPosition.timestamp) / 1000;
    if (deltaSeconds > 0) {
      const inferred = distance / deltaSeconds;
      if (inferred >= MIN_SPEED_MPS) {
        return inferred;
      }
    }
  }
  return ASSUMED_SPEED_MPS;
};

const handleDriverLocationUpdate = async (io, socket, payload) => {
  if (!socket.user) {
    socket.emit('auth:error', { message: 'Socket not authenticated' });
    return;
  }

  const { driverId, tripId, busId, lat, lng, timestamp, speed } = payload || {};
  if (!tripId || typeof lat !== 'number' || typeof lng !== 'number') {
    return;
  }

  const driverKey = driverId || socket.user.id;
  const now = Date.now();
  const lastPing = driverThrottle.get(driverKey) || 0;
  if (now - lastPing < MIN_UPDATE_INTERVAL_MS) {
    return;
  }
  driverThrottle.set(driverKey, now);

  const state = await getActiveTripState(tripId);
  if (!state) {
    socket.emit('trip:error', { message: 'Trip not found for tracking' });
    return;
  }

  const room = `trip_${tripId}`;
  socket.join(room);

  // Update Bus Model (Overwrite)
  try {
    await updateBusLocation(state.trip.bus, { lat, lng });
  } catch (err) {
    console.error('Bus Update Error:', err.message);
  }

  // Persist Breadcrumb (History)
  try {
    await pushLocationUpdate(tripId, { lat, lng, speed, heading: payload?.heading, timestamp: now });
  } catch (err) {
    console.error('Breadcrumb Error:', err.message);
  }

  let forceEtaEmit = !Object.keys(state.etaCache || {}).length;

  // Look ahead up to 5 stops to handle simulation jumps or GPS drift
  const LOOK_AHEAD = 5;
  let detectedStop = null;
  let detectedIndex = -1;

  for (let i = 0; i < LOOK_AHEAD; i++) {
    const idx = state.currentStopIndex + i;
    if (idx >= state.routeStops.length) break;

    const candidateStop = state.routeStops[idx];
    const dist = distanceMeters({ lat, lng }, { lat: candidateStop.lat, lng: candidateStop.lng });

    if (dist <= RADIUS_METERS) {
      detectedStop = candidateStop;
      detectedIndex = idx;
      break;
    }
  }

  if (detectedStop && detectedIndex > state.currentStopIndex) {
    console.log(`[Jump Detected] Fast-forwarding from Stop ${state.currentStopIndex} to ${detectedIndex}`);
    state.currentStopIndex = detectedIndex;
    resetInsideWindow(state, detectedIndex);
  }

  const nextStop = state.routeStops[state.currentStopIndex];
  if (nextStop) {
    const distance = distanceMeters({ lat, lng }, { lat: nextStop.lat, lng: nextStop.lng });
    // console.log(`[Stop Check] ${nextStop.name}: ${Math.round(distance)}m (Radius: ${RADIUS_METERS}m)`);

    if (distance <= RADIUS_METERS) {
      state.insideWindow.timestamps.push(now);
      state.insideWindow.timestamps = state.insideWindow.timestamps.filter(
        (ts) => now - ts <= SUSTAIN_TIME_MS
      );

      if (!state.insideWindow.arrivedMarked) {
        const firstTs = state.insideWindow.timestamps[0];
        // If simulated (force: true) or sustained duration met
        if (payload.force || (firstTs && now - firstTs >= SUSTAIN_TIME_MS)) {
          console.log(`[ARRIVED] ${nextStop.name}`);
          state.insideWindow.arrivedMarked = true;
          let arrivalTs = Date.now(); // Default to now

          try {
            const event = await persistStopEvent({
              tripId,
              stopIndex: nextStop.seq,
              stopName: nextStop.name,
              status: 'ARRIVED',
              location: { lat, lng },
              source: 'auto'
            });
            arrivalTs = new Date(event.timestamp).getTime();
            state.arrivalLog[nextStop.seq] = arrivalTs;
            io.to(room).emit('trip:stop_arrived', {
              tripId,
              stopIndex: event.stopIndex,
              stopName: event.stopName,
              timestamp: event.timestamp
            });

            // CRITICAL FIX: Persist the new stop index to DB so clients fetching /trip get the live state
            const Trip = require('../models/Trip');
            await Trip.findByIdAndUpdate(tripId, { currentStopIndex: state.currentStopIndex });

            // NEW: Send "Bus Arrived" Push to students assigned to this stop
            // Fire and forget (async)
            (async () => {
              try {
                const User = require('../models/User');
                const { sendPush } = require('./notificationController');
                // Find students assigned to this bus (and theoretically this stop)
                const studentsAtStop = await User.find({
                  assignedBusId: state.trip.bus,
                  role: 'student',
                  pushSubscription: { $ne: null },
                });

                // Since I don't trust the assignment population model fully right now (User doesn't embed assignment directly?), 
                // I will just broadcast "Bus at [StopName]" to ALL students on this bus for now to ensure delivery,
                // OR better, we check 'stopCoordinates' distance like before if assignment is tricky.
                // But user specifically asked "bus at each stop".
                // Let's iterate found students and send.
                for (const stu of studentsAtStop) {
                  await sendPush(stu, {
                    title: 'Bus Arrived',
                    body: `Bus has reached ${event.stopName}`,
                    url: '/student',
                    tag: 'arrival-alert'
                  });
                }
              } catch (pushErr) {
                console.error('Arrival Push Error:', pushErr.message);
              }
            })();

          } catch (evtErr) {
            console.error('Persist Arrived Error:', evtErr.message);
          }

          const previousArrival = typeof nextStop.seq === 'number' ? state.arrivalLog[nextStop.seq - 1] : null;
          if (
            typeof nextStop.seq === 'number' &&
            nextStop.seq > 0 &&
            typeof previousArrival === 'number' &&
            arrivalTs > previousArrival
          ) {
            const observedSec = (arrivalTs - previousArrival) / 1000;
            const updatedSegment = await updateSegmentStats(state.route._id, nextStop.seq - 1, observedSec);
            if (updatedSegment) {
              state.route.segStats = state.route.segStats || [];
              state.route.segStats[nextStop.seq - 1] = updatedSegment;
            }
            forceEtaEmit = true;
          } else {
            forceEtaEmit = true;
          }
        }
      }
    } else {
      state.insideWindow.timestamps = [];
      if (
        state.insideWindow.arrivedMarked &&
        !state.insideWindow.leftMarked &&
        distance >= LEAVE_RADIUS_METERS
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
        if (updatedTrip) {
          state.trip = updatedTrip;
          state.currentStopIndex = updatedTrip.currentStopIndex;
        } else {
          state.currentStopIndex += 1;
        }
        resetInsideWindow(state, state.currentStopIndex);
        forceEtaEmit = true;
      }
    }
  }

  const speedMps = computeSpeedMps(state, { lat, lng }, speed, now);
  state.lastPosition = { lat, lng, timestamp: now };

  // 1. IMMEDIATE ECHO: Update UI before doing heavy math/DB
  io.to(room).emit('trip:location_update', {
    tripId,
    busId: busId || state.trip.bus,
    lat,
    lng,
    timestamp: timestamp || now
  });

  // 2. Heavy Validations (Stop Logic, ETAs, Push)
  // These can run asynchronously or after the echo
  const rawEtas = await computeRawEtas(state, { lat, lng }, speedMps);
  emitEtaUpdateIfNeeded(io, tripId, state, rawEtas, { force: forceEtaEmit });

  // --- Push Notification Logic (Throttled) ---
  // Check every 15 seconds or so per trip to save DB calls?
  // Or check every time but optimize the DB query.
  // We'll check every time for now, assuming low scale.

  if (!state.notifiedStudents) {
    state.notifiedStudents = new Set();
  }

  const checkPush = async () => {
    try {
      const { sendPush } = require('./notificationController');
      const User = require('../models/User'); // delayed import to avoid circular dependency issues if any

      // DEBUG: Deep inspection of query mismatch
      console.log("DEBUG: Trip ID:", tripId);
      console.log("DEBUG: Trip Bus ID:", state.trip.bus, "Type:", typeof state.trip.bus);

      const debugCount = await User.countDocuments({
        assignedBusId: state.trip.bus,
        role: 'student'
      });
      console.log("DEBUG: Found", debugCount, "students with matching assignedBusId (ignoring push/coords).");

      if (debugCount === 0) {
        const sample = await User.findOne({ role: 'student' });
        console.log("DEBUG: Sample Student:", sample ? sample.username : "None");
        if (sample) {
          console.log("DEBUG: Sample Student BusID:", sample.assignedBusId, "Type:", typeof sample.assignedBusId);
        }
      }

      // Find students ensuring we have their push subscription and stop coordinates
      // Optimization: In a real app, cache this list in state.activeTrips
      const students = await User.find({
        assignedBusId: state.trip.bus,
        role: 'student',
        pushSubscription: { $ne: null },
        'stopCoordinates.lat': { $exists: true }
      }).select('pushSubscription stopCoordinates name');

      for (const student of students) {
        if (state.notifiedStudents.has(student._id.toString())) continue;

        const stopCoords = student.stopCoordinates;
        if (!stopCoords || !stopCoords.lat) continue;

        const dist = distanceMeters({ lat, lng }, stopCoords);
        console.log("Checking Student:", student.name, "Distance:", dist, "Threshold: 1000m");
        // 1km = 1000 meters
        if (dist <= 1000) {
          console.log(`Sending 1km Alert to student ${student.name}`);
          await sendPush(student, {
            title: 'Bus Approaching!',
            body: `Bus is ${Math.round(dist)}m away from your stop.`,
            url: '/student',
            tag: 'proximity-alert'
          });
          state.notifiedStudents.add(student._id.toString());
        }
      }
    } catch (err) {
      console.error('Push Check Error:', err.message);
    }
  };

  // Fire and forget, don't await
  checkPush();
};

const handleManualEvent = async (io, socket, payload) => {
  if (!socket.user) {
    return;
  }
  const { tripId, stopIndex, status, lat, lng } = payload || {};
  if (!tripId || typeof stopIndex !== 'number' || !status) {
    return;
  }

  const state = await getActiveTripState(tripId);
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
    state.arrivalLog[stopIndex] = new Date(event.timestamp).getTime();
    state.insideWindow = {
      stopIndex,
      timestamps: [],
      arrivedMarked: true,
      leftMarked: false
    };
  } else if (status === 'LEFT') {
    state.insideWindow.leftMarked = true;
    const updatedTrip = await advanceToNextStop(tripId);
    state.trip = updatedTrip || state.trip;
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

    const joinedTrips = new Set();

    const subscribeToTrip = (tripId, source = 'student:subscribe') => {
      const normalized = tripId ? tripId.toString() : null;
      if (!normalized) return;
      const room = `trip_${normalized}`;
      socket.join(room);
      joinedTrips.add(normalized);
      socket.emit('trip:subscribed', { tripId: normalized, source });
    };

    const unsubscribeFromTrip = (tripId) => {
      const normalized = tripId ? tripId.toString() : null;
      if (!normalized) return;
      const room = `trip_${normalized}`;
      socket.leave(room);
      joinedTrips.delete(normalized);
      socket.emit('trip:unsubscribed', { tripId: normalized });
    };

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

    socket.on('student:subscribe', ({ tripId } = {}) => {
      if (!socket.user) {
        socket.emit('trip:subscription_error', { message: 'Authenticate before subscribing.' });
        return;
      }
      if (!tripId) {
        socket.emit('trip:subscription_error', { message: 'tripId is required.' });
        return;
      }
      subscribeToTrip(tripId);
    });

    socket.on('student:unsubscribe', ({ tripId } = {}) => {
      if (!tripId) return;
      unsubscribeFromTrip(tripId);
    });

    socket.on('join', ({ room, tripId } = {}) => {
      const resolvedTripId = tripId || (typeof room === 'string' && room.startsWith('trip_') ? room.slice(5) : null);
      const targetRoom = room || (resolvedTripId ? `trip_${resolvedTripId}` : null);
      if (!targetRoom) {
        socket.emit('trip:subscription_error', { message: 'Room or tripId is required.' });
        return;
      }
      socket.join(targetRoom);
      if (resolvedTripId) {
        joinedTrips.add(resolvedTripId);
        socket.emit('trip:subscribed', { tripId: resolvedTripId, source: 'legacy:join' });
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
