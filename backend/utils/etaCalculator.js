// Simple ETA calculator that uses the configured average travel minutes per stop
const calculateEtaMinutes = ({ orderedStops = [], currentIndex = 0, targetStopId, defaultMinutes = 2 }) => {
  if (!orderedStops.length || !targetStopId) {
    return defaultMinutes;
  }

  const normalizedIndex = Math.max(currentIndex, 0);
  const targetIndex = orderedStops.findIndex((stop) => stop._id.toString() === targetStopId.toString());

  if (targetIndex === -1) {
    return defaultMinutes;
  }

  let eta = 0;
  for (let idx = normalizedIndex; idx < targetIndex; idx += 1) {
    const stop = orderedStops[idx];
    const minutes = stop?.averageTravelMinutes || defaultMinutes;
    eta += minutes;
  }

  return eta || defaultMinutes;
};

module.exports = calculateEtaMinutes;
