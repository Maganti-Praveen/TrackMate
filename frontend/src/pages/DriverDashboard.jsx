import { useEffect, useMemo, useState } from 'react';
import { useMapEvents } from 'react-leaflet';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { refreshSocketAuth, useSocket } from '../hooks/useSocket';
import useGeolocation from '../hooks/useGeolocation';
import TrackingControls from '../components/TrackingControls';
import DriverMap from '../components/DriverMap';
import { ELURU_SIM_PATH } from '../constants/geo';

const SIM_PATH = ELURU_SIM_PATH;

// Helper component to capture map clicks
const MapClickSimulator = ({ onLocationUpdate }) => {
  useMapEvents({
    click(e) {
      onLocationUpdate(e.latlng);
    }
  });
  return null;
};

const DriverDashboard = () => {
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosMessage, setSosMessage] = useState('Bus Breakdown');
  const [visitorCount, setVisitorCount] = useState(0);

  const handleConfirmSos = () => {
    if (!trip) return;
    const finalMessage = sosMessage.trim() || 'Bus Breakdown';
    const payload = {
      tripId: trip._id || trip.id,
      location: lastPosition ? { lat: lastPosition.lat, lng: lastPosition.lng } : null,
      message: finalMessage
    };
    socket.emit('driver:sos', payload);
    addLog(`SOS SENT: ${finalMessage}`);
    setStatusMessage('SOS ALERT BROADCASTED');
    setShowSosModal(false);
  };

  const [isSimulationMode, setIsSimulationMode] = useState(false); // Manual click-to-teleport (God Mode)
  const [debugLog, setDebugLog] = useState([]);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const addLog = (message) => {
    setDebugLog((prev) => [`${new Date().toLocaleTimeString()} ${message}`, ...prev].slice(0, 20));
  };

  const { socket, isConnected, bufferSize, emitLocation } = useSocket(
    useMemo(
      () => ({
        'trip:stop_arrived': (payload) => addLog(`ARRIVED event ${payload.stopIndex ?? ''}`),
        'trip:stop_left': (payload) => addLog(`LEFT event ${payload.stopIndex ?? ''}`),
        'trip:location_update': () => addLog('Server echoed location update'),
        'stats:live_visitors': (count) => setVisitorCount(count)
      }),
      []
    )
  );

  const { isTracking, permissionStatus, lastPosition, error: geoError, pingsSent, startTracking, stopTracking } =
    useGeolocation({
      onPosition: (position) => {
        // If God Mode (Manual Simulation) is active, ignore real GPS to prevent jumping
        if (isSimulationMode) return;

        if (!trip) {
          addLog('Position skipped (no active trip).');
          return;
        }
        const resolvedBusId =
          (trip?.bus && typeof trip.bus === 'object')
            ? trip.bus._id || trip.bus.id || trip.bus
            : trip?.bus || trip?.busId || user?.assignedBusId;
        const payload = {
          driverId: user?.id || user?._id,
          tripId: trip._id || trip.id,
          busId: resolvedBusId,
          lat: position.lat,
          lng: position.lng,
          accuracy: position.accuracy,
          speed: position.speed,
          heading: position.heading,
          timestamp: position.timestamp
        };
        const sent = emitLocation(payload);
        addLog(sent ? `Sent ${position.lat},${position.lng}` : 'Buffered location (offline)');
        setStatusMessage(sent ? 'Live location transmitted.' : 'Offline. Location buffered.');
      },

    });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setStatusMessage('Back online. Flushing buffered positions.');
      refreshSocketAuth();
      addLog('Network reconnected.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setStatusMessage('Offline. Locations will be buffered.');
      addLog('Network offline.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchActiveTrip = async () => {
    try {
      const { data } = await api.get('/trips/active');
      if (data?._id) {
        setTrip(data);
      }
    } catch (error) {
      console.warn('No active trip', error.response?.data || error.message);
    }
  };

  useEffect(() => {
    fetchActiveTrip();
  }, []);

  const ensureTrip = () => {
    if (!user?.assignedBusId) {
      setStatusMessage('No bus is assigned to your account. Contact admin.');
      return false;
    }
    return true;
  };

  const handleStartTrip = async () => {
    if (!ensureTrip()) return;
    setStatusMessage('Starting trip...');
    try {
      const { data } = await api.post('/trips/start', { busId: user?.assignedBusId });
      setTrip(data);
      // AUTO-START TRACKING
      refreshSocketAuth();
      startTracking();
      setStatusMessage('Trip started & Live Tracking Active.');
      addLog(`Trip started ${data._id}`);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to start trip.';
      setStatusMessage(message);
      addLog(message);
    }
  };

  const handleEndTrip = async () => {
    if (!trip) {
      setStatusMessage('No active trip.');
      return;
    }
    stopTracking();
    setStatusMessage('Ending trip...');
    const tripId = trip._id || trip.id;
    try {
      try {
        await api.post(`/trips/${tripId}/end`);
      } catch (err) {
        await api.post('/trips/end', { tripId });
      }
      setTrip(null);
      setStatusMessage('Trip ended.');
      addLog('Trip ended.');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to end trip.';
      setStatusMessage(message);
      addLog(message);
    }
  };

  const warnings = [
    'Keep screen on and browser in foreground. Mobile browsers pause GPS updates in the background.',
    'Accuracy depends on device sensors and network. Expect 10-30m drift.'
  ];

  const handleManualLocation = (latlng) => {
    if (!trip) {
      setStatusMessage('Start a trip to use simulation.');
      return;
    }
    const { lat, lng } = latlng;
    const resolvedBusId =
      (trip?.bus && typeof trip.bus === 'object')
        ? trip.bus._id || trip.bus.id || trip.bus
        : trip?.bus || trip?.busId || user?.assignedBusId;

    const payload = {
      driverId: user?.id || user?._id,
      tripId: trip._id || trip.id,
      busId: resolvedBusId,
      lat,
      lng,
      accuracy: 5, // High accuracy for manual clicks
      speed: 12, // Simulated speed (~43 km/h)
      heading: 0,
      timestamp: Date.now(),
      force: true // Force immediate arrival logic on backend
    };

    emitLocation(payload);
    addLog(`[MANUAL] Teleported to ${lat.toFixed(6)},${lng.toFixed(6)}`);
    setStatusMessage('Manual location updated.');
    // Optimistically update local map
    // Note: The socket echo will update it officially, but we could update lastPosition here if needed.
  };

  const handleResetDailyHistory = async () => {
    if (!window.confirm("Are you sure you want to delete all of TODAY's completed trips? This cannot be undone.")) {
      return;
    }
    try {
      const { data } = await api.delete('/trips/history/today');
      addLog(data.message);
      setStatusMessage(data.message);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to clear history';
      setStatusMessage(msg);
      addLog(msg);
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 text-white">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">Driver Streaming Dashboard</h1>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-500/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {visitorCount} Online
            </span>
          </div>
          <p className="text-sm text-slate-300">
            Logged in as {user?.name || user?.username}. Bus: {user?.assignedBusId || 'unassigned'}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-start md:justify-end">
          <button
            onClick={handleResetDailyHistory}
            className="rounded-full bg-red-900/40 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-900/60"
          >
            Clear Today's History
          </button>
          <button
            onClick={() => {
              const newMode = !isSimulationMode;
              setIsSimulationMode(newMode);
              if (newMode) {
                stopTracking();
                addLog('Simulation Mode ON: GPS Tracking Paused.');
              } else {
                if (trip) {
                  startTracking();
                  addLog('Simulation Mode OFF: GPS Tracking Resumed.');
                }
              }
            }}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${isSimulationMode
              ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
          >
            {isSimulationMode ? '🛠️ God Mode ON' : '🛠️ Enable Sim'}
          </button>
          <button
            onClick={() => {
              if (!trip) {
                setStatusMessage('Start a trip to use SOS.');
                return;
              }
              setSosMessage('Bus Breakdown');
              setShowSosModal(true);
            }}
            className="flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-rose-600/40 hover:bg-rose-700 animate-pulse"
          >
            🚨 SOS PANIC
          </button>
        </div>
      </header>

      <TrackingControls
        isTracking={isTracking}
        connectionStatus={isConnected ? 'connected' : 'disconnected'}
        permissionStatus={permissionStatus}
        bufferSize={bufferSize}
        lastPosition={lastPosition}
        pingsSent={pingsSent}
        onStartTrip={handleStartTrip}
        onEndTrip={handleEndTrip}
        tripId={trip?._id || trip?.id}
        warnings={warnings}

      />

      {
        statusMessage && (
          <div className="rounded border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-100">
            {statusMessage}
            {!isOnline && <span className="ml-2 text-amber-600">(offline)</span>}
            {isSimulationMode && <div className="mt-1 text-xs text-indigo-300">Tap anywhere on the map to teleport bus.</div>}
          </div>
        )
      }
      {geoError && <p className="text-sm text-rose-300">GPS error: {geoError}</p>}

      <DriverMap lastPosition={lastPosition} busId={trip?.bus?._id || trip?.bus} route={trip?.route}>
        {isSimulationMode && <MapClickSimulator onLocationUpdate={handleManualLocation} />}
      </DriverMap>

      <section className="surface-card rounded-2xl p-4 shadow">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Stream Status</h2>
          <span className="text-xs text-slate-300">Trip ID: {trip?._id || trip?.id || 'none'}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 text-sm text-slate-200">
          <div>
            <p>Socket: {isConnected ? 'Connected' : 'Disconnected'}</p>
            <p>Permission: {permissionStatus}</p>
            <p>Tracking: {isTracking ? 'Active' : 'Stopped'}</p>
            <p>Buffered points: {bufferSize}</p>
            <p>Pings sent: {pingsSent}</p>
          </div>
          <div>
            <p>Last lat/lng: {lastPosition ? `${lastPosition.lat}, ${lastPosition.lng}` : 'n/a'}</p>
            <p>Accuracy: {lastPosition?.accuracy ?? 'n/a'} m</p>
            <p>Speed: {lastPosition?.speed ?? 'n/a'} m/s</p>
            <p>Heading: {lastPosition?.heading ?? 'n/a'}</p>
            <p>Timestamp: {lastPosition ? new Date(lastPosition.timestamp).toLocaleTimeString() : 'n/a'}</p>
          </div>
        </div>
      </section>

      <section className="surface-card--alt rounded-2xl p-4 text-xs">
        <h2 className="mb-2 text-base font-semibold text-white">Debug Log</h2>
        <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap text-xs">
          {debugLog.length ? debugLog.join('\n') : 'Waiting for events...'}
        </pre>
      </section>

      {/* Custom SOS Modal */}
      {showSosModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-md space-y-4 rounded-3xl border-2 border-rose-500 bg-slate-900 p-6 shadow-[0_0_50px_rgba(225,29,72,0.6)] animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-rose-500/20 p-4 mb-4 ring-2 ring-rose-500/50">
                <span className="text-4xl animate-pulse">🚨</span>
              </div>
              <h2 className="text-2xl font-bold uppercase tracking-widest text-white">Emergency Broadcast</h2>
              <p className="mt-2 text-sm text-rose-200/80">
                This will alert all connected students and admins immediately.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nature of Emergency</label>
              <input
                type="text"
                autoFocus
                value={sosMessage}
                onChange={(e) => setSosMessage(e.target.value)}
                placeholder="e.g. Flat Tyre, Engine Smoke, Accident..."
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-lg text-white placeholder-white/20 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition"
              />
              <div className="flex gap-2 flex-wrap">
                {['Bus Breakdown', 'Flat Tyre', 'Medical Emergency', 'Accident'].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => setSosMessage(suggestion)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/30 transition"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <button
                onClick={() => setShowSosModal(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSos}
                className="rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-3 font-bold text-white shadow-lg shadow-rose-600/30 hover:scale-[1.02] hover:shadow-rose-600/50 transition-all active:scale-[0.98]"
              >
                BROADCAST SOS
              </button>
            </div>
          </div>
        </div>
      )}
    </main >
  );
};

export default DriverDashboard;
