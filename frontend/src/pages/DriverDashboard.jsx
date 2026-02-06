import { useEffect, useMemo, useState } from 'react';
import { useMapEvents } from 'react-leaflet';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { refreshSocketAuth, useSocket } from '../hooks/useSocket';
import useGeolocation from '../hooks/useGeolocation';
import DriverMap from '../components/DriverMap';
import { ELURU_SIM_PATH } from '../constants/geo';
import {
  Play, Square, MapPin, Wifi, WifiOff, Navigation,
  AlertTriangle, Radio, Users, Gauge, Clock, Trash2,
  Crosshair, Send, RotateCcw
} from 'lucide-react';

const SIM_PATH = ELURU_SIM_PATH;

const MapClickSimulator = ({ onLocationUpdate }) => {
  useMapEvents({ click(e) { onLocationUpdate(e.latlng); } });
  return null;
};

// ===== COMPONENTS =====

const StatusBadge = ({ connected, label }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
    }`}>
    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
    {label}
  </span>
);

const StatItem = ({ icon: Icon, label, value, highlight }) => (
  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
    <div className={`p-2 rounded-lg ${highlight ? 'bg-indigo-500/20' : 'bg-white/5'}`}>
      <Icon className={`w-4 h-4 ${highlight ? 'text-indigo-400' : 'text-slate-400'}`} />
    </div>
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  </div>
);

const ActionButton = ({ onClick, icon: Icon, label, variant = 'default', disabled, className = '' }) => {
  const variants = {
    default: 'bg-white/5 hover:bg-white/10 text-white',
    primary: 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25',
    success: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25',
    warning: 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );
};

// ===== MAIN COMPONENT =====

const DriverDashboard = () => {
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosMessage, setSosMessage] = useState('Bus Breakdown');
  const [visitorCount, setVisitorCount] = useState(0);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [simulatedPosition, setSimulatedPosition] = useState(null);
  const [debugLog, setDebugLog] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator?.onLine ?? true);
  const [showDebug, setShowDebug] = useState(false);

  const addLog = (message) => {
    setDebugLog(prev => [`${new Date().toLocaleTimeString()} ${message}`, ...prev].slice(0, 20));
  };

  const { socket, isConnected, bufferSize, emitLocation } = useSocket(
    useMemo(() => ({
      'trip:stop_arrived': (p) => addLog(`✅ ARRIVED: Stop ${p.stopIndex ?? ''}`),
      'trip:stop_left': (p) => addLog(`🚌 LEFT: Stop ${p.stopIndex ?? ''}`),
      'trip:location_update': () => addLog('📍 Location synced'),
      'stats:live_visitors': setVisitorCount
    }), [])
  );

  const { isTracking, permissionStatus, lastPosition, error: geoError, pingsSent, startTracking, stopTracking } =
    useGeolocation({
      onPosition: (position) => {
        if (isSimulationMode || !trip) return;

        const payload = {
          driverId: user?.id || user?._id,
          tripId: trip._id || trip.id,
          busId: trip?.bus?._id || trip?.bus?.id || trip?.bus || user?.assignedBusId,
          lat: position.lat,
          lng: position.lng,
          accuracy: position.accuracy,
          speed: position.speed,
          heading: position.heading,
          timestamp: position.timestamp
        };

        const sent = emitLocation(payload);
        addLog(sent ? `📡 Sent: ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` : '📦 Buffered (offline)');
        setStatusMessage(sent ? 'Broadcasting location...' : 'Offline - buffering');
      }
    });

  // Online/Offline handlers
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); refreshSocketAuth(); addLog('🌐 Online'); };
    const handleOffline = () => { setIsOnline(false); addLog('📴 Offline'); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch active trip
  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const { data } = await api.get('/trips/active');
        if (data?._id) setTrip(data);
      } catch { }
    };
    fetchTrip();
  }, []);

  const handleStartTrip = async () => {
    if (!user?.assignedBusId) {
      setStatusMessage('No bus assigned. Contact admin.');
      return;
    }
    try {
      const { data } = await api.post('/trips/start', { busId: user.assignedBusId });
      setTrip(data);
      refreshSocketAuth();

      // Only start GPS tracking if NOT in simulation mode
      if (!isSimulationMode) {
        startTracking();
        setStatusMessage('Trip started! Broadcasting GPS location.');
      } else {
        setStatusMessage('Trip started! Tap map to teleport bus.');
      }
      addLog(`🚀 Trip started: ${data._id}`);
    } catch (err) {
      setStatusMessage(err.response?.data?.message || 'Failed to start');
    }
  };

  const handleEndTrip = async () => {
    if (!trip) return;
    stopTracking();
    try {
      await api.post(`/trips/${trip._id || trip.id}/end`).catch(() =>
        api.post('/trips/end', { tripId: trip._id || trip.id })
      );
      setTrip(null);
      setStatusMessage('Trip ended.');
      addLog('🏁 Trip ended');
    } catch (err) {
      setStatusMessage(err.response?.data?.message || 'Failed to end trip');
    }
  };

  const handleManualLocation = (latlng) => {
    if (!trip) return setStatusMessage('Start a trip first');
    if (!isSimulationMode) return setStatusMessage('Enable simulation mode to teleport');

    const payload = {
      driverId: user?.id,
      tripId: trip._id || trip.id,
      busId: trip?.bus?._id || trip?.bus,
      lat: latlng.lat,
      lng: latlng.lng,
      accuracy: 5,
      speed: 12,
      heading: 0,
      timestamp: Date.now(),
      force: true
    };

    emitLocation(payload);

    // Update local simulated position for UI
    setSimulatedPosition({
      lat: latlng.lat,
      lng: latlng.lng,
      speed: 12,
      timestamp: Date.now()
    });

    setStatusMessage(`Teleported to ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
    addLog(`🎯 Teleport: ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
  };

  const handleSos = () => {
    if (!trip) return;
    socket.emit('driver:sos', {
      tripId: trip._id || trip.id,
      location: lastPosition ? { lat: lastPosition.lat, lng: lastPosition.lng } : null,
      message: sosMessage.trim() || 'Bus Breakdown'
    });
    addLog(`🚨 SOS: ${sosMessage}`);
    setShowSosModal(false);
  };

  const handleClearHistory = async () => {
    if (!confirm("Clear today's completed trips?")) return;
    try {
      const { data } = await api.delete('/trips/history/today');
      addLog(data.message);
    } catch { }
  };

  const handleClearTrip = async () => {
    if (!confirm("Clear today's trip and start fresh? This will end any active trip.")) return;
    try {
      // First stop tracking if active
      stopTracking();

      // End active trip if exists
      if (trip) {
        await api.post(`/trips/${trip._id || trip.id}/end`).catch(() =>
          api.post('/trips/end', { tripId: trip._id || trip.id })
        );
      }

      // Clear today's history
      await api.delete('/trips/history/today').catch(() => { });

      // Reset local state
      setTrip(null);
      setStatusMessage('Trip cleared. Ready to start fresh!');
      addLog('🧹 Trip cleared - ready for fresh start');
    } catch (err) {
      setStatusMessage(err.response?.data?.message || 'Failed to clear trip');
    }
  };

  return (
    <main className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">Driver Mode</p>
            <h1 className="text-2xl font-bold text-white">{user?.name || user?.username}</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge connected={isConnected} label={isConnected ? 'Live' : 'Offline'} />
            <span className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-full text-xs text-slate-400">
              <Users className="w-3 h-3" />
              {visitorCount}
            </span>
          </div>
        </header>

        {/* Trip Control Card */}
        <div className="card-elevated p-6">
          <div className="text-center mb-6">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${trip ? 'bg-emerald-500/20' : 'bg-slate-700'
              }`}>
              {trip ? (
                <Radio className="w-10 h-10 text-emerald-400 animate-pulse" />
              ) : (
                <Navigation className="w-10 h-10 text-slate-400" />
              )}
            </div>
            <h2 className="text-xl font-bold text-white mb-1">
              {trip ? 'Trip Active' : 'Ready to Start'}
            </h2>
            <p className="text-slate-400 text-sm">
              {trip ? `Broadcasting to ${visitorCount} students` : 'Start a trip to begin tracking'}
            </p>
          </div>

          {/* Trip Actions */}
          <div className="grid grid-cols-2 gap-3">
            {!trip ? (
              <ActionButton
                onClick={handleStartTrip}
                icon={Play}
                label="Start Trip"
                variant="success"
                className="col-span-2"
                disabled={!user?.assignedBusId}
              />
            ) : (
              <>
                <ActionButton
                  onClick={handleEndTrip}
                  icon={Square}
                  label="End Trip"
                  variant="danger"
                />
                <ActionButton
                  onClick={() => { setSosMessage('Bus Breakdown'); setShowSosModal(true); }}
                  icon={AlertTriangle}
                  label="SOS"
                  variant="warning"
                />
              </>
            )}
          </div>

          {/* Clear Trip Button */}
          <button
            onClick={handleClearTrip}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 hover:border-white/10 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Clear Today's Trip
          </button>

          {/* Status Message */}
          {statusMessage && (
            <p className="mt-4 text-center text-sm text-slate-400 animate-fade-in">
              {statusMessage}
              {!isOnline && <span className="text-amber-400 ml-1">(offline)</span>}
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatItem icon={Wifi} label="Socket" value={isConnected ? 'Connected' : 'Disconnected'} highlight={isConnected} />
          <StatItem icon={MapPin} label="Mode" value={isSimulationMode ? 'Simulation' : 'GPS'} highlight={!isSimulationMode && permissionStatus === 'granted'} />
          <StatItem icon={Send} label="Pings Sent" value={pingsSent} />
          <StatItem icon={Gauge} label="Speed" value={(() => {
            const pos = isSimulationMode ? simulatedPosition : lastPosition;
            return pos?.speed ? `${Math.round(pos.speed * 3.6)} km/h` : '0 km/h';
          })()} />
        </div>

        {/* Simulation Toggle */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Simulation Mode</p>
              <p className="text-slate-400 text-xs">
                {isSimulationMode ? 'GPS OFF - Tap map to teleport' : 'GPS ON - Real location tracking'}
              </p>
            </div>
            <button
              onClick={() => {
                const newSimMode = !isSimulationMode;
                setIsSimulationMode(newSimMode);

                if (newSimMode) {
                  // Turning simulation ON - stop GPS tracking
                  stopTracking();
                  setStatusMessage('Simulation mode ON. GPS disabled. Tap map to teleport.');
                  addLog('🎮 Simulation mode ON - GPS disabled');
                } else {
                  // Turning simulation OFF - start GPS tracking if trip is active
                  if (trip) {
                    startTracking();
                    setStatusMessage('Simulation mode OFF. GPS tracking enabled.');
                  }
                  addLog('📍 Simulation mode OFF - GPS enabled');
                }
              }}
              className={`relative w-14 h-8 rounded-full transition-colors ${isSimulationMode ? 'bg-indigo-500' : 'bg-slate-700'
                }`}
            >
              <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${isSimulationMode ? 'translate-x-6' : ''
                }`} />
            </button>
          </div>

          {/* Mode indicator */}
          <div className={`mt-3 px-3 py-2 rounded-lg text-xs font-medium ${isSimulationMode
            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
            {isSimulationMode
              ? '🎮 Manual teleport active - GPS is disabled'
              : '📍 GPS tracking active - Real-time location'}
          </div>
        </div>

        {/* Map */}
        <div className="card overflow-hidden">
          <div className="h-64 md:h-80">
            <DriverMap
              lastPosition={isSimulationMode ? simulatedPosition : lastPosition}
              busId={trip?.bus?._id || trip?.bus}
              route={trip?.route}
            >
              {isSimulationMode && <MapClickSimulator onLocationUpdate={handleManualLocation} />}
            </DriverMap>
          </div>
        </div>

        {/* Debug Log Toggle */}
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="w-full card p-3 text-center text-slate-400 text-sm hover:bg-white/5 transition"
        >
          {showDebug ? 'Hide' : 'Show'} Debug Log ({debugLog.length})
        </button>

        {showDebug && (
          <div className="card p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">Debug Log</h3>
              <button onClick={handleClearHistory} className="text-xs text-red-400 hover:text-red-300">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <pre className="text-xs text-slate-400 max-h-40 overflow-y-auto whitespace-pre-wrap font-mono">
              {debugLog.length ? debugLog.join('\n') : 'No events yet...'}
            </pre>
          </div>
        )}

        {/* GPS Error */}
        {geoError && (
          <div className="card p-4 bg-red-500/10 border-red-500/20">
            <p className="text-red-400 text-sm">GPS Error: {geoError}</p>
          </div>
        )}
      </div>

      {/* SOS Modal */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="card-elevated p-6 max-w-sm w-full bg-slate-900 border-red-500/30">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Emergency Broadcast</h2>
              <p className="text-slate-400 text-sm">Alert all students and admins</p>
            </div>

            <input
              type="text"
              value={sosMessage}
              onChange={(e) => setSosMessage(e.target.value)}
              placeholder="Describe emergency..."
              className="w-full mb-4"
              autoFocus
            />

            <div className="flex flex-wrap gap-2 mb-6">
              {['Bus Breakdown', 'Flat Tyre', 'Medical Emergency', 'Accident'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setSosMessage(opt)}
                  className="px-3 py-1 text-xs rounded-full bg-white/5 text-slate-300 hover:bg-white/10 transition"
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowSosModal(false)} className="py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition">
                Cancel
              </button>
              <button onClick={handleSos} className="py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition">
                BROADCAST
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default DriverDashboard;
