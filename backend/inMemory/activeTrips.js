const Trip = require('../models/Trip');
const Route = require('../models/Route');
const Stop = require('../models/Stop');
const StopEvent = require('../models/StopEvent');
const { ensureSegStatsShape } = require('../utils/segmentStats');

const activeTrips = new Map();

const buildInsideWindow = (index = 0) => ({
  stopIndex: index,
  timestamps: [],
  arrivedMarked: false,
  leftMarked: false
});

const sortStops = (stops = []) => [...stops].sort((a, b) => (a.seq || 0) - (b.seq || 0));

const normalizeStop = (rawStop = {}) => {
  const plain = typeof rawStop.toObject === 'function' ? rawStop.toObject() : rawStop;
  const seq = typeof plain.seq === 'number' ? plain.seq : plain.sequence;
  return {
    ...plain,
    seq,
    lat: plain.lat ?? plain.latitude,
    lng: plain.lng ?? plain.longitude
  };
};

const composeRouteStops = async (route) => {
  const embeddedStops = sortStops(route.stops || []).map(normalizeStop);
  const physicalStops = await Stop.find({ route: route._id }).sort({ sequence: 1 });
  const physicalBySeq = new Map(
    physicalStops.map((stop) => [stop.sequence, {
      id: stop._id.toString(),
      lat: stop.latitude,
      lng: stop.longitude,
      name: stop.name
    }])
  );

  return embeddedStops.map((stop) => {
    const physical = physicalBySeq.get(stop.seq);
    return {
      ...stop,
      name: stop.name || physical?.name,
      lat: stop.lat ?? physical?.lat,
      lng: stop.lng ?? physical?.lng,
      stopRef: physical?.id
    };
  });
};

const createState = (trip, route, routeStops) => ({
  tripId: trip._id.toString(),
  trip,
  route,
  routeStops,
  lastPosition: null,
  lastEmitTime: 0,
  etaCache: {},
  insideWindow: buildInsideWindow(trip.currentStopIndex || 0),
  arrivalLog: {},
  currentStopIndex: trip.currentStopIndex || 0
});

const rebuildActiveFromDB = async (tripId) => {
  if (!tripId) return null;
  const trip = await Trip.findById(tripId);
  if (!trip) return null;
  const route = await Route.findById(trip.route);
  if (!route) return null;
  ensureSegStatsShape(route);
  const routeStops = await composeRouteStops(route);

  const state = createState(trip, route, routeStops);
  const events = await StopEvent.find({ trip: tripId }).sort({ timestamp: 1 }).limit(200);
  events.forEach((event) => {
    if (event.status === 'ARRIVED') {
      state.arrivalLog[event.stopIndex] = new Date(event.timestamp).getTime();
      state.currentStopIndex = Math.max(state.currentStopIndex, event.stopIndex);
    }
  });

  activeTrips.set(tripId.toString(), state);
  return state;
};

const getActiveTripState = async (tripId) => {
  if (!tripId) return null;
  const key = tripId.toString();
  const existing = activeTrips.get(key);
  if (existing && existing.trip && existing.route) {
    return existing;
  }
  return rebuildActiveFromDB(tripId);
};

const getCachedTripState = (tripId) => {
  if (!tripId) return null;
  return activeTrips.get(tripId.toString()) || null;
};

const resetInsideWindow = (state, index) => {
  if (!state) return;
  const nextIndex = typeof index === 'number' ? index : state.currentStopIndex;
  state.insideWindow = buildInsideWindow(nextIndex);
};

module.exports = {
  activeTrips,
  getActiveTripState,
  getCachedTripState,
  rebuildActiveFromDB,
  resetInsideWindow
};
