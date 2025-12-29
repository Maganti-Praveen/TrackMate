const Stop = require('../models/Stop');
const Trip = require('../models/Trip');
const StudentAssignment = require('../models/StudentAssignment');
const { getCachedTripState } = require('../inMemory/activeTrips');
const Route = require('../models/Route');

// Improved fallback: works with both stopId and sequence number
const fallbackEtaMs = async ({ trip, targetStopId, targetStopSeq }) => {
  if (!trip) return null;
  
  // Try to get stops from route's embedded stops first (more reliable)
  const route = await Route.findById(trip.route);
  let orderedStops = [];
  
  if (route?.stops?.length > 0) {
    // Use embedded stops from route (sorted by seq)
    orderedStops = [...route.stops].sort((a, b) => (a.seq || 0) - (b.seq || 0));
  } else {
    // Fallback to physical Stop collection
    orderedStops = await Stop.find({ route: trip.route }).sort({ sequence: 1 });
  }
  
  if (!orderedStops.length) return null;
  
  const currentIndex = Math.max(trip.currentStopIndex || 0, 0);
  
  // Find target stop by sequence (primary) or by _id (fallback)
  let targetIndex = -1;
  if (targetStopSeq != null) {
    targetIndex = orderedStops.findIndex((stop) => 
      String(stop.seq ?? stop.sequence) === String(targetStopSeq)
    );
  }
  if (targetIndex === -1 && targetStopId) {
    targetIndex = orderedStops.findIndex((stop) => 
      String(stop._id) === String(targetStopId)
    );
  }
  
  if (targetIndex === -1 || targetIndex <= currentIndex) {
    return null;
  }
  
  let etaMs = 0;
  for (let idx = currentIndex; idx < targetIndex; idx += 1) {
    const stop = orderedStops[idx];
    const minutes = stop?.averageTravelMinutes || Number(process.env.DEFAULT_ETA_MINUTES) || 2;
    etaMs += minutes * 60 * 1000;
  }
  return etaMs;
};

const StopEvent = require('../models/StopEvent'); // Required

const getAssignment = async (req, res) => {
  const assignment = await StudentAssignment.findOne({ student: req.user._id })
    .populate('bus', 'name numberPlate lastKnownLocation')
    .populate('stop');

  if (!assignment) {
    return res.json(null);
  }

  // Fetch recent events for the active trip of this bus
  let recentEvents = [];
  const activeTrip = await Trip.findOne({ bus: assignment.bus._id, status: 'ONGOING' });

  if (activeTrip) {
    recentEvents = await StopEvent.find({ trip: activeTrip._id })
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();
  }

  const response = assignment.toObject();
  response.recentEvents = recentEvents;

  res.json(response);
};

const getEta = async (req, res) => {
  const assignment = await StudentAssignment.findOne({ student: req.user._id })
    .populate('stop')
    .populate('bus');
  if (!assignment) {
    return res.status(404).json({ message: 'No assignment found' });
  }

  const trip = await Trip.findOne({ bus: assignment.bus._id, status: 'ONGOING' }).populate('route');
  if (!trip) {
    return res.json({ etaMs: null, source: 'no-trip' });
  }

  const targetStopId = assignment.stop?._id?.toString();
  // Get sequence from both possible field names
  const targetStopSeq = assignment.stop?.sequence ?? assignment.stop?.seq;
  const targetStopSeqStr = targetStopSeq != null ? String(targetStopSeq) : null;

  const activeState = getCachedTripState(trip._id);

  // Try to find ETA in cache - check by sequence FIRST (our primary key now)
  let liveEta = null;
  
  if (activeState?.etaCache) {
    // Priority 1: Match by sequence (our standardized key)
    if (targetStopSeqStr && typeof activeState.etaCache[targetStopSeqStr] === 'number') {
      liveEta = activeState.etaCache[targetStopSeqStr];
    }
    // Priority 2: Match by MongoDB _id (legacy support)
    if (typeof liveEta !== 'number' && targetStopId && typeof activeState.etaCache[targetStopId] === 'number') {
      liveEta = activeState.etaCache[targetStopId];
    }
    // Priority 3: Search through all entries for a match
    if (typeof liveEta !== 'number') {
      const cacheEntries = Object.entries(activeState.etaCache);
      for (const [key, value] of cacheEntries) {
        if (typeof value === 'number' && (key === targetStopSeqStr || key === targetStopId)) {
          liveEta = value;
          break;
        }
      }
    }
  }

  if (typeof liveEta === 'number') {
    return res.json({ 
      etaMs: Math.max(0, Math.round(liveEta)), 
      etaMinutes: Math.ceil(liveEta / 60000),
      source: 'live' 
    });
  }

  // Fallback calculation with both ID and sequence
  const fallbackMs = await fallbackEtaMs({ trip, targetStopId, targetStopSeq });
  return res.json({ 
    etaMs: fallbackMs, 
    etaMinutes: fallbackMs ? Math.ceil(fallbackMs / 60000) : null,
    source: 'fallback' 
  });
};

const registerNotificationToken = async (req, res) => {
  const { token } = req.body;
  const assignment = await StudentAssignment.findOneAndUpdate(
    { student: req.user._id },
    { notificationToken: token },
    { new: true }
  );
  res.json(assignment);
};

const getLiveTrip = async (req, res) => {
  const assignment = await StudentAssignment.findOne({ student: req.user._id });
  if (!assignment) {
    return res.status(404).json({ message: 'No assignment found' });
  }

  const trip = await Trip.findOne({ bus: assignment.bus, status: 'ONGOING' })
    .populate('bus', 'name lastKnownLocation')
    .populate('driver', 'name phone')
    .populate('route'); // This fetches the full route with stops array

  if (!trip) {
    return res.json(null);
  }

  const response = trip.toObject();
  const stops = response.route?.stops || [];
  const idx = response.currentStopIndex || 0;

  response.currentStop = stops[idx] || null;
  response.nextStop = stops[idx + 1] || null;
  response.progress = {
    totalStops: stops.length,
    completedStops: idx,
    percentage: stops.length ? Math.round((idx / stops.length) * 100) : 0
  };

  res.json(response);
};

module.exports = { getAssignment, getEta, registerNotificationToken, getLiveTrip };
