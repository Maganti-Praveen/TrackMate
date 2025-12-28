const Stop = require('../models/Stop');
const Trip = require('../models/Trip');
const StudentAssignment = require('../models/StudentAssignment');
const { getCachedTripState } = require('../inMemory/activeTrips');

const fallbackEtaMs = async ({ trip, targetStopId }) => {
  if (!trip || !targetStopId) return null;
  const orderedStops = await Stop.find({ route: trip.route }).sort({ sequence: 1 });
  const currentIndex = Math.max(trip.currentStopIndex || 0, 0);
  const targetIndex = orderedStops.findIndex((stop) => stop._id.toString() === targetStopId.toString());
  if (targetIndex === -1) {
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
  const activeState = getCachedTripState(trip._id);
  const liveEta = targetStopId && activeState?.etaCache?.[targetStopId];
  if (typeof liveEta === 'number') {
    return res.json({ etaMs: Math.max(0, Math.round(liveEta)), source: 'live' });
  }

  const fallbackMs = await fallbackEtaMs({ trip, targetStopId });
  return res.json({ etaMs: fallbackMs, source: 'fallback' });
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
