import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_INTERVAL_MS = Number(import.meta.env.VITE_MIN_UPDATE_INTERVAL_MS) || 3000;
const GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 2000,
  timeout: 10000
};

const simulatePoint = (lat, lng, idx = 0) => ({
  lat,
  lng,
  accuracy: 15,
  speed: null,
  heading: null,
  timestamp: Date.now() + idx * MIN_INTERVAL_MS
});

export const useGeolocation = ({ onPosition, simulate = false, simulatedPath = [] } = {}) => {
  const [isTracking, setIsTracking] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('prompt');
  const [lastPosition, setLastPosition] = useState(null);
  const [error, setError] = useState('');
  const [pingsSent, setPingsSent] = useState(0);

  const watchIdRef = useRef(null);
  const lastEmitRef = useRef(0);
  const simulationTimer = useRef(null);
  const simulationIndex = useRef(0);

  const stopSimulation = () => {
    if (simulationTimer.current) {
      clearInterval(simulationTimer.current);
      simulationTimer.current = null;
    }
  };

  const clearWatch = () => {
    if (watchIdRef.current !== null && navigator.geolocation?.clearWatch) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
  };

  const handlePosition = useCallback(
    (position) => {
      const now = Date.now();
      if (now - lastEmitRef.current < MIN_INTERVAL_MS) {
        return;
      }
      lastEmitRef.current = now;
      const normalized = {
        lat: Number(position.coords.latitude.toFixed(6)),
        lng: Number(position.coords.longitude.toFixed(6)),
        accuracy: position.coords.accuracy ?? null,
        speed: position.coords.speed ?? null,
        heading: position.coords.heading ?? null,
        timestamp: position.timestamp || now
      };
      setLastPosition(normalized);
      setPingsSent((prev) => prev + 1);
      onPosition?.(normalized);
    },
    [onPosition]
  );

  const startSimulation = useCallback(() => {
    if (!simulatedPath.length) {
      setError('Simulation path is empty.');
      return;
    }
    stopSimulation();
    simulationIndex.current = 0;
    setIsTracking(true);
    simulationTimer.current = setInterval(() => {
      const point = simulatedPath[simulationIndex.current % simulatedPath.length];
      simulationIndex.current += 1;
      handlePosition(simulatePoint(point.lat, point.lng, simulationIndex.current));
    }, MIN_INTERVAL_MS);
  }, [handlePosition, simulatedPath.length, simulatedPath]);

  const startTracking = useCallback(() => {
    setError('');
    if (simulate) {
      startSimulation();
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      setPermissionStatus('unsupported');
      return;
    }

    try {
      if (navigator.permissions?.query) {
        navigator.permissions
          .query({ name: 'geolocation' })
          .then((result) => setPermissionStatus(result.state))
          .catch(() => {});
      }
    } catch (permError) {
      console.warn('Permission query failed', permError);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPermissionStatus('granted');
        setIsTracking(true);
        handlePosition(pos);
      },
      (geoError) => {
        const msg = geoError.message || 'Unable to read GPS position.';
        setError(msg);
        setPermissionStatus(geoError.code === 1 ? 'denied' : 'error');
        setIsTracking(false);
        clearWatch();
      },
      GEO_OPTIONS
    );
  }, [handlePosition, simulate, startSimulation]);

  const stopTracking = useCallback(() => {
    stopSimulation();
    clearWatch();
    setIsTracking(false);
  }, []);

  useEffect(() => () => stopTracking(), [stopTracking]);

  return {
    isTracking,
    permissionStatus,
    lastPosition,
    error,
    pingsSent,
    startTracking,
    stopTracking
  };
};

export default useGeolocation;
