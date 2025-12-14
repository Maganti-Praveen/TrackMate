
const {
  MIN_SPEED_MPS,
  ASSUMED_SPEED_MPS,
  DEFAULT_SEG_SEC,
  ETA_ALPHA,
  OSRM_BASE_URL,
  OSRM_CACHE_TTL_MS
} = require('../config/constants');
const { distanceMeters, projectPointOnLineAndRemainingDistance } = require('./geoUtils');

const resolveStopId = (stop) => {
  if (!stop) return null;
  if (stop.stopRef) return stop.stopRef.toString();
  if (stop._id) return stop._id.toString();
  if (stop.id) return stop.id.toString();
  if (typeof stop.seq !== 'undefined') return String(stop.seq);
  return null;
};

const remainingDistanceToStop = (routeDoc, position, stop) => {
  if (!position || !stop) return Infinity;
  const geojson = routeDoc?.geojson;
  if (geojson) {
    const result = projectPointOnLineAndRemainingDistance(geojson, position, stop);
    if (Number.isFinite(result?.remainingMeters)) {
      return result.remainingMeters;
    }
  }
  return distanceMeters(position, stop);
};

// --- OSRM Helpers ---

const buildOsrmUrl = (coords) => {
  // Coords: [[lng, lat], [lng, lat], ...]
  if (coords.length < 2) return null;
  const points = coords.map(([lng, lat]) => `${lng},${lat}`).join(';');
  return `${OSRM_BASE_URL}/route/v1/driving/${points}?overview=false`;
};

const fetchOsrmDurations = async (stops, currentPos) => {
  try {
    const coords = [[currentPos.lng, currentPos.lat]];
    stops.forEach(s => coords.push([s.lng, s.lat]));

    const url = buildOsrmUrl(coords);
    if (!url) return null;

    console.log("[OSRM] URL:", url);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout

    try {
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        console.warn(`OSRM Error: ${resp.statusText}`);
        return null;
      }
      const data = await resp.json();
      if (!data.routes || !data.routes.length) return null;

      return data.routes[0].legs.map(leg => leg.duration);
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError') {
        console.warn('OSRM request timed out (1.5s). Falling back to linear estimates.');
      } else {
        console.error('OSRM Fetch Failed:', fetchErr.message);
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    console.error('OSRM Setup Failed:', err.message);
    return null;
  }
};

const computeRawEtas = async (state, position, speedMps = 0) => {
  if (!state?.routeStops?.length || !state.trip) {
    return {};
  }
  const orderedStops = state.routeStops;
  const trip = state.trip;
  const segStats = Array.isArray(state.route?.segStats) ? state.route.segStats : [];
  const upcomingIndex = Math.min(Math.max(trip.currentStopIndex || 0, 0), orderedStops.length - 1);
  const nextStop = orderedStops[upcomingIndex];
  if (!nextStop) {
    return {};
  }

  // 1. Immediate Next Stop (Local Physics)
  const velocity = speedMps >= MIN_SPEED_MPS ? speedMps : ASSUMED_SPEED_MPS;
  const distToNext = remainingDistanceToStop(state.route, position, nextStop) || 0;
  const nextEtaMs = (distToNext / velocity) * 1000;

  const rawEtas = {};
  const nextStopId = resolveStopId(nextStop);
  rawEtas[nextStopId] = nextEtaMs;

  // 2. Subsequent Stops (OSRM / Historical)
  const subsequentStops = orderedStops.slice(upcomingIndex); // [NextStop, Next+1, ...]

  // Check Cache
  const now = Date.now();
  let osrmCache = state.osrmCache;
  if (!osrmCache || (now - osrmCache.timestamp > OSRM_CACHE_TTL_MS)) {
    // Cache stale or missing
    state.osrmCache = { timestamp: now, durations: [] }; // Reset
    // We only query OSRM for the sequence of *remaining* stops to be efficient
    // Query: NextStop -> Next+1 -> Next+2 ...
    // Note: The logic above calculated Current -> NextStop manually.
    // OSRM is best for Stop -> Stop segments.

    if (subsequentStops.length > 1) {
      // We need durations for: Next -> Stop+1, Stop+1 -> Stop+2, etc.
      const stopsForOsrm = subsequentStops.map(s => ({ lat: s.lat, lng: s.lng }));
      // For the query, we can just pass the stops themselves.
      // The 'currentPos' arg in fetchOsrmDurations usually implies Current -> FirstStop, 
      // but here we want relations between stops.
      // Let's modify fetch usage slightly:
      // We'll ask OSRM for the path: [NextStop, Stop+1, Stop+2 ...]
      const durations = await fetchOsrmDurations(subsequentStops.slice(1), { lat: nextStop.lat, lng: nextStop.lng });

      if (durations) {
        state.osrmCache.durations = durations;
        state.osrmCache.startIndex = upcomingIndex; // Tie cache to specific stop index
      }
    }
  }

  // Use OSRM or Fallback
  // matching logic: if cache is valid and matches our current sequence
  const useOsrm = state.osrmCache?.durations?.length > 0 && state.osrmCache.startIndex === upcomingIndex;

  let cumulativeMs = nextEtaMs;

  // existing loop updated
  for (let i = 0; i < subsequentStops.length - 1; i++) {
    const currentS = subsequentStops[i];
    const targetS = subsequentStops[i + 1]; // This correspond to orderedStops[upcomingIndex + 1 + i]

    let segmentDurationMs;

    if (useOsrm && typeof state.osrmCache.durations[i] === 'number') {
      segmentDurationMs = state.osrmCache.durations[i] * 1000;
    } else {
      // Fallback to Stats
      // original idx logic:
      const originalIdx = upcomingIndex + i;
      const segment = segStats[originalIdx] || {};
      const avgSec = typeof segment.avgSec === 'number' ? segment.avgSec : DEFAULT_SEG_SEC;
      segmentDurationMs = avgSec * 1000;
    }

    cumulativeMs += segmentDurationMs;
    const stopId = resolveStopId(targetS);
    rawEtas[stopId] = cumulativeMs;
  }

  return rawEtas;
};

const smoothEtas = (state, rawEtas = {}) => {
  const previousCache = state.etaCache || {};
  const smoothed = {};
  Object.entries(rawEtas).forEach(([stopId, etaMs]) => {
    const previous = previousCache[stopId];
    if (typeof previous === 'number') {
      smoothed[stopId] = previous + ETA_ALPHA * (etaMs - previous);
    } else {
      smoothed[stopId] = etaMs;
    }
  });
  return { prevCache: previousCache, smoothed };
};

const etasToArrayOrShape = (etaMap = {}) => {
  const entries = Object.entries(etaMap).map(([stopId, etaMs]) => ({
    stopId,
    etaMs: Math.max(0, Math.round(etaMs))
  }));
  const etasMap = entries.reduce((acc, entry) => {
    acc[entry.stopId] = entry.etaMs;
    return acc;
  }, {});
  return { array: entries, map: etasMap };
};

module.exports = {
  computeRawEtas,
  smoothEtas,
  etasToArrayOrShape,
  resolveStopId
};
