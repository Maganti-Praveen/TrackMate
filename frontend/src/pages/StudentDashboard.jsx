import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  MapPin, Navigation, Bell, BellOff, RefreshCw, Phone,
  ChevronRight, AlertTriangle, Gauge, Clock, Bus, Volume2, Settings
} from 'lucide-react';
import StudentMap from '../components/StudentMap';
import { useSocket } from '../hooks/useSocket';
import { api } from '../utils/api';
import { formatETA, computeFallbackETA } from '../utils/etaUtils';
import { useAuth } from '../hooks/useAuth';

const TOKEN_KEY = 'tm_token';
const NOTIFICATION_PREF_KEY = 'tm_student_notifications';
const EVENTS_STORAGE_KEY = 'tm_student_events';
const DEPARTED_STORAGE_KEY = 'tm_student_departed';
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BDXVEVzz8rwtAK895AB89T--U1VMZ6FvyLQLF7em-fp3tQTDih-cT5ONqt_4qG88i8iBdRHdzavUvVvk7nQOOH8';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const normalizeLocation = (location) => {
  if (!location) return null;
  const lat = location.lat ?? location.latitude ?? location?.coords?.lat ?? location?.location?.lat;
  const lng = location.lng ?? location.longitude ?? location?.coords?.lng ?? location?.location?.lng;
  if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng };
  return null;
};

const normalizeStop = (data = {}) => data?.stop || data?.assignedStop || data?.assignment?.stop || null;
const normalizeBus = (data = {}) => data?.bus || data?.assignment?.bus || null;
const deriveTripId = (data = {}) => data?.currentTripId || data?.tripId || data?.activeTrip?._id || null;

// ===== COMPONENTS =====

const StatCard = ({ icon: Icon, label, value, subtext, highlight }) => (
  <div className={`card p-4 ${highlight ? 'ring-2 ring-indigo-500/50' : ''}`}>
    <div className="flex items-start justify-between mb-2">
      <div className={`p-2 rounded-xl ${highlight ? 'bg-indigo-500/20' : 'bg-white/5'}`}>
        <Icon className={`w-5 h-5 ${highlight ? 'text-indigo-400' : 'text-slate-400'}`} />
      </div>
    </div>
    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-xl font-bold ${highlight ? 'text-indigo-400' : 'text-white'}`}>{value}</p>
    {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
  </div>
);

const QuickAction = ({ icon: Icon, label, onClick, variant = 'default', disabled }) => {
  const variants = {
    default: 'bg-white/5 hover:bg-white/10 text-slate-300',
    primary: 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-300',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 ${variants[variant]}`}
    >
      <Icon className="w-6 h-6" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};

const EventItem = ({ event }) => (
  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
    <div className={`p-2 rounded-full ${event.type === 'ARRIVED' ? 'bg-emerald-500/20' : 'bg-orange-500/20'}`}>
      {event.type === 'ARRIVED' ? (
        <MapPin className="w-4 h-4 text-emerald-400" />
      ) : (
        <Navigation className="w-4 h-4 text-orange-400" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-white truncate">
        {event.type === 'ARRIVED' ? 'Arrived at' : 'Left'} {event.stopName}
      </p>
      <p className="text-xs text-slate-400">{new Date(event.timestamp).toLocaleTimeString()}</p>
    </div>
  </div>
);

// ===== MAIN COMPONENT =====

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [profile, setProfile] = useState(user);
  const [busPosition, setBusPosition] = useState(null);
  const [stopInfo, setStopInfo] = useState(null);
  const [tripId, setTripId] = useState(null);
  const [journey, setJourney] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);
  const [eta, setEta] = useState(null);
  const [busSpeed, setBusSpeed] = useState(0);
  const [visitorCount, setVisitorCount] = useState(0);
  const [sosAlert, setSosAlert] = useState(null);
  const [historyEvents, setHistoryEvents] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(EVENTS_STORAGE_KEY));
      return Array.isArray(stored?.events) ? stored.events : [];
    } catch { return []; }
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() =>
    localStorage.getItem(NOTIFICATION_PREF_KEY) === 'true'
  );
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    enabled: true,
    proximityMinutes: 5,
    proximityMeters: 500,
    arrivalAlert: true
  });
  // Track when bus has departed from student's stop
  const [stopDepartedInfo, setStopDepartedInfo] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DEPARTED_STORAGE_KEY)); } catch { return null; }
  });

  const subscribedTripRef = useRef(null);
  const previousTripIdRef = useRef(() => {
    // Restore previous trip ID from stored events so we don't wipe them on refresh
    try {
      const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (stored) {
        const events = JSON.parse(stored);
        return events._tripId || null;
      }
    } catch { /* ignore */ }
    return null;
  });
  // Initialize ref value from the factory
  if (typeof previousTripIdRef.current === 'function') {
    previousTripIdRef.current = previousTripIdRef.current();
  }

  // Socket handlers
  const handleLocationUpdate = useCallback((payload) => {
    if (!payload) return;
    const newPos = normalizeLocation(payload);
    if (newPos) {
      setBusPosition(newPos);
      if (typeof payload.speed === 'number') setBusSpeed(payload.speed);
    }
  }, []);

  const handleEtaUpdate = useCallback((payload) => {
    if (!payload || !stopInfo) return;
    const targetSeq = String(stopInfo?.seq ?? stopInfo?.sequence ?? '');

    // Try etasMap first
    if (payload?.etasMap && typeof payload.etasMap[targetSeq] === 'number') {
      setEta({ value: payload.etasMap[targetSeq], source: 'server', updatedAt: Date.now() });
      return;
    }

    // Try etas array
    if (Array.isArray(payload?.etas)) {
      const match = payload.etas.find(e => String(e.stopId) === targetSeq);
      if (match?.etaMs) {
        setEta({ value: match.etaMs, source: 'server', updatedAt: Date.now() });
      }
    }
  }, [stopInfo]);

  const handleStopEvent = useCallback((payload, type) => {
    const event = {
      type,
      stopName: payload?.stopName || `Stop ${payload?.stopIndex ?? ''}`,
      stopIndex: payload?.stopIndex,
      timestamp: payload?.timestamp || Date.now()
    };
    setHistoryEvents(prev => {
      const updated = [event, ...prev].slice(0, 10);
      // Persist to localStorage with trip ID
      try { localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify({ _tripId: previousTripIdRef.current, events: updated })); } catch { /* ignore */ }
      return updated;
    });

    // Check if this is the student's stop
    const studentStopSeq = stopInfo?.seq ?? stopInfo?.sequence;
    const isMyStop = studentStopSeq != null && payload?.stopIndex === studentStopSeq;

    if (isMyStop) {
      if (type === 'ARRIVED') {
        // Bus arrived at student's stop
        const info = { arrivedAt: event.timestamp, stopName: event.stopName };
        setStopDepartedInfo(prev => {
          const updated = { ...prev, ...info };
          try { localStorage.setItem(DEPARTED_STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
          return updated;
        });
        toast.success(`Bus has arrived at your stop!`, { icon: '🎉', duration: 5000 });
      } else if (type === 'LEFT') {
        // Bus left student's stop - switch to departed mode
        const info = { departedAt: event.timestamp, stopName: event.stopName, hasDeparted: true };
        setStopDepartedInfo(prev => {
          const updated = { ...prev, ...info };
          try { localStorage.setItem(DEPARTED_STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
          return updated;
        });
        toast('Bus has departed from your stop', { icon: '🚌', duration: 5000 });
      }
    } else {
      toast[type === 'ARRIVED' ? 'success' : 'custom'](
        `Bus ${type === 'ARRIVED' ? 'arrived at' : 'left'} ${event.stopName}`,
        { icon: type === 'ARRIVED' ? '📍' : '🚌' }
      );
    }
    fetchProfile();
  }, [stopInfo]);

  const socketHandlers = useMemo(() => ({
    'trip:location_update': handleLocationUpdate,
    'trip:eta_update': handleEtaUpdate,
    'trip:stop_arrived': (p) => handleStopEvent(p, 'ARRIVED'),
    'trip:stop_left': (p) => handleStopEvent(p, 'LEFT'),
    'trip:sos': setSosAlert,
    'stats:live_visitors': setVisitorCount,
  }), [handleLocationUpdate, handleEtaUpdate, handleStopEvent]);

  const { socket, isConnected } = useSocket(socketHandlers);
  const isAuthenticated = !!localStorage.getItem(TOKEN_KEY);

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/students/me').catch(() => api.get('/auth/me'));
      const data = response.data;

      setProfile({ ...user, ...data });
      setStopInfo(normalizeStop(data));
      setBusPosition(normalizeLocation(normalizeBus(data)?.lastKnownLocation));

      const tripRes = await api.get('/students/trip').catch(() => ({ data: null }));
      if (tripRes.data) {
        const newTripId = tripRes.data._id;

        // Reset departed state and events only if this is a genuinely different trip
        if (previousTripIdRef.current && newTripId !== previousTripIdRef.current) {
          setStopDepartedInfo(null);
          setHistoryEvents([]);
          localStorage.removeItem(EVENTS_STORAGE_KEY);
          localStorage.removeItem(DEPARTED_STORAGE_KEY);
        }

        previousTripIdRef.current = newTripId;
        setTripId(newTripId);
        setJourney({
          currentStop: tripRes.data.currentStop,
          nextStop: tripRes.data.nextStop,
          progress: tripRes.data.progress
        });
        if (tripRes.data.driver) setDriverInfo(tripRes.data.driver);
        const livePos = normalizeLocation(tripRes.data?.bus?.lastKnownLocation);
        if (livePos) setBusPosition(livePos);

        setStatusMessage('Live tracking active');
      } else {
        // No active trip - trip has ended, clear everything
        if (previousTripIdRef.current) {
          previousTripIdRef.current = null;
          setTripId(null);
          setStopDepartedInfo(null);
          setHistoryEvents([]);
          setEta(null);
          setBusPosition(null);
          setJourney(null);
          localStorage.removeItem(EVENTS_STORAGE_KEY);
          localStorage.removeItem(DEPARTED_STORAGE_KEY);
        }
        setStatusMessage('Waiting for driver to start trip');
      }

      // Fetch ETA only if there's an active trip
      if (tripRes.data) {
        const etaRes = await api.get('/students/eta').catch(() => ({ data: {} }));
        if (typeof etaRes.data?.etaMinutes === 'number') {
          setEta({ value: etaRes.data.etaMinutes * 60 * 1000, source: 'server', updatedAt: Date.now() });
        }
      }
    } catch (err) {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
    fetchProfile();
  }, [fetchProfile]);

  // Subscribe to trip socket
  useEffect(() => {
    if (!socket || !tripId || !isAuthenticated) return;
    socket.emit('student:subscribe', { tripId });
    subscribedTripRef.current = tripId;
    return () => {
      socket.emit('student:unsubscribe', { tripId });
    };
  }, [socket, tripId, isAuthenticated]);

  // Fallback ETA calculation
  useEffect(() => {
    if (eta?.source === 'server' && Date.now() - eta.updatedAt < 10000) return;
    if (busPosition && stopInfo) {
      const fallback = computeFallbackETA(busPosition, normalizeLocation(stopInfo), busSpeed || 5);
      if (fallback) setEta(prev => {
        // Skip update if value hasn't meaningfully changed (within 5s)
        if (prev?.source === 'fallback' && Math.abs((prev.value || 0) - fallback) < 5000) return prev;
        return { value: fallback, source: 'fallback', updatedAt: Date.now() };
      });
    }
  }, [busPosition, stopInfo, busSpeed]);

  // Push notification handlers
  const enableNotifications = async () => {
    if (!('Notification' in window)) return toast.error('Not supported');
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== 'granted') return toast.error('Permission denied');

    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      await api.post('/notifications/subscribe', sub);
      setNotificationsEnabled(true);
      localStorage.setItem(NOTIFICATION_PREF_KEY, 'true');
      toast.success('Notifications enabled');
    } catch (err) {
      toast.error('Failed to enable notifications');
    }
  };

  const disableNotifications = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
    } catch { }
    setNotificationsEnabled(false);
    localStorage.setItem(NOTIFICATION_PREF_KEY, 'false');
    toast('Notifications disabled', { icon: '🔕' });
  };

  // Fetch and save notification preferences
  const fetchPreferences = async () => {
    try {
      const res = await api.get('/students/preferences');
      setPreferences(res.data);
    } catch { }
  };

  const savePreferences = async (newPrefs) => {
    try {
      await api.put('/students/preferences', newPrefs);
      setPreferences(prev => ({ ...prev, ...newPrefs }));
      toast.success('Preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    }
  };

  useEffect(() => { fetchPreferences(); }, []);

  const speakStatus = () => {
    if (!('speechSynthesis' in window)) return;
    const etaText = eta?.value ? formatETA(eta.value) : 'unknown';
    const text = `Your bus will arrive at ${stopInfo?.name || 'your stop'} in approximately ${etaText}`;
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };

  const formattedEta = eta?.value ? formatETA(eta.value) : '—';
  const stopPosition = stopInfo ? normalizeLocation(stopInfo) : null;

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your dashboard...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-6 text-center max-w-sm">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Something went wrong</p>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button onClick={fetchProfile} className="btn-primary px-6 py-2 rounded-xl">
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24 md:pb-8">
      {/* SOS Alert Modal */}
      {sosAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="card-elevated p-6 max-w-sm w-full text-center bg-red-950 border-red-500/50">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Emergency Alert</h2>
            <p className="text-red-200 mb-4">{sosAlert.message}</p>
            <button onClick={() => setSosAlert(null)} className="w-full py-3 bg-white/10 rounded-xl text-white font-medium hover:bg-white/20 transition">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="card-elevated p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Alert Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Proximity Minutes */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">
                  Alert when bus is within: <span className="text-indigo-400 font-bold">{preferences.proximityMinutes} min</span>
                </label>
                <input
                  type="range"
                  min="1" max="30"
                  value={preferences.proximityMinutes}
                  onChange={(e) => setPreferences(p => ({ ...p, proximityMinutes: Number(e.target.value) }))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1 min</span><span>15 min</span><span>30 min</span>
                </div>
              </div>

              {/* Proximity Meters */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">
                  Or within: <span className="text-indigo-400 font-bold">{preferences.proximityMeters}m</span>
                </label>
                <input
                  type="range"
                  min="100" max="2000" step="100"
                  value={preferences.proximityMeters}
                  onChange={(e) => setPreferences(p => ({ ...p, proximityMeters: Number(e.target.value) }))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>100m</span><span>1km</span><span>2km</span>
                </div>
              </div>

              {/* Arrival Alert Toggle */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <span className="text-white">Arrival alerts</span>
                <button
                  onClick={() => setPreferences(p => ({ ...p, arrivalAlert: !p.arrivalAlert }))}
                  className={`w-12 h-7 rounded-full transition-colors ${preferences.arrivalAlert ? 'bg-indigo-500' : 'bg-slate-700'}`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white transition-transform mx-1 ${preferences.arrivalAlert ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>

            <button
              onClick={() => { savePreferences(preferences); setShowSettings(false); }}
              className="w-full mt-6 py-3 bg-indigo-500 text-white font-medium rounded-xl hover:bg-indigo-600 transition"
            >
              Save Preferences
            </button>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">Welcome back,</p>
            <h1 className="text-2xl font-bold text-white">{profile?.name || user?.username}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </header>

        {/* ETA Hero Card */}
        <div className="card-elevated p-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10" />
          <div className="relative">
            {!tripId ? (
              /* No active trip - waiting for driver */
              <>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full bg-slate-500/20 text-slate-400 text-xs font-medium">
                    Waiting
                  </span>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-slate-400 mb-2">
                  🚌 No Active Trip
                </p>
                <p className="text-slate-500 text-sm mb-4">
                  Waiting for driver to start the trip
                </p>
                <div className="p-4 rounded-xl bg-white/5 text-center">
                  <p className="text-slate-400 text-sm">
                    Your bus will appear here once the driver begins the route
                  </p>
                </div>
              </>
            ) : stopDepartedInfo?.hasDeparted ? (
              /* Bus has departed - show post-event state */
              <>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium">
                    Departed
                  </span>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white mb-2">
                  🚌 Bus has departed
                </p>
                <p className="text-slate-400 text-sm mb-4">
                  from <span className="text-orange-400 font-medium">{stopDepartedInfo.stopName || stopInfo?.name}</span>
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {stopDepartedInfo.arrivedAt && (
                    <div className="p-3 rounded-xl bg-white/5">
                      <p className="text-slate-400 text-xs mb-1">Arrived at</p>
                      <p className="text-white font-medium">
                        {new Date(stopDepartedInfo.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                  {stopDepartedInfo.departedAt && (
                    <div className="p-3 rounded-xl bg-white/5">
                      <p className="text-slate-400 text-xs mb-1">Departed at</p>
                      <p className="text-white font-medium">
                        {new Date(stopDepartedInfo.departedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-slate-500 text-xs mt-4 text-center">
                  📍 Bus is continuing on route — see map below
                </p>
              </>
            ) : (
              /* Normal ETA display */
              <>
                <p className="text-slate-400 text-sm mb-2">Estimated Arrival</p>
                <p className="text-4xl md:text-5xl font-bold text-white mb-2">{formattedEta}</p>
                <p className="text-slate-400 text-sm">
                  to <span className="text-indigo-400 font-medium">{stopInfo?.name || 'your stop'}</span>
                </p>
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-4 text-sm">
                  <span className="text-slate-400">Progress:</span>
                  <div className="flex-1 max-w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${journey?.progress?.percentage || 0}%` }}
                    />
                  </div>
                  <span className="text-white font-medium">{journey?.progress?.percentage || 0}%</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Bus}
            label="Bus"
            value={profile?.bus?.name || 'N/A'}
            subtext={profile?.bus?.numberPlate}
          />
          <StatCard
            icon={Gauge}
            label="Speed"
            value={`${Math.round(busSpeed * 3.6)} km/h`}
            subtext="Real-time"
            highlight={busSpeed > 0}
          />
          <StatCard
            icon={MapPin}
            label="Your Stop"
            value={stopInfo?.name || 'Not assigned'}
            subtext={`Stop #${stopInfo?.seq || '—'}`}
          />
          <StatCard
            icon={Clock}
            label="Status"
            value={stopDepartedInfo?.hasDeparted ? 'Departed' : tripId ? 'Active' : 'Waiting'}
            subtext={stopDepartedInfo?.hasDeparted ? 'Bus passed your stop' : statusMessage}
            highlight={stopDepartedInfo?.hasDeparted}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          <QuickAction
            icon={RefreshCw}
            label="Refresh"
            onClick={fetchProfile}
          />
          <QuickAction
            icon={Volume2}
            label="Speak"
            onClick={speakStatus}
          />
          <QuickAction
            icon={notificationsEnabled ? Bell : BellOff}
            label={notificationsEnabled ? 'Alerts On' : 'Alerts Off'}
            onClick={notificationsEnabled ? disableNotifications : enableNotifications}
            variant={notificationsEnabled ? 'primary' : 'default'}
          />
          <QuickAction
            icon={Settings}
            label="Settings"
            onClick={() => setShowSettings(true)}
          />
        </div>

        {/* Map */}
        <div className="card overflow-hidden">
          <div className="h-64 md:h-80">
            <StudentMap busPosition={busPosition} stopPosition={stopPosition} />
          </div>
        </div>

        {/* Driver Info */}
        {driverInfo && (
          <div className="card p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <span className="text-xl">👨‍✈️</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{driverInfo.name}</p>
                <p className="text-slate-400 text-sm">Your Driver</p>
              </div>
              {driverInfo.phone && (
                <a
                  href={`tel:${driverInfo.phone}`}
                  className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition"
                >
                  <Phone className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Recent Events */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Events</h2>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-2">
            {historyEvents.length > 0 ? (
              historyEvents.map((event, idx) => (
                <EventItem key={`${event.timestamp}-${idx}`} event={event} />
              ))
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">No events yet</p>
            )}
          </div>
        </div>

        {/* Test Notification */}
        <button
          onClick={async () => {
            try {
              toast('Sending test...');
              await api.get('/notifications/test-push');
              toast.success('Check your notifications!');
            } catch (err) {
              toast.error('Test failed');
            }
          }}
          disabled={!notificationsEnabled}
          className="w-full card p-4 text-center text-indigo-400 font-medium hover:bg-white/5 transition disabled:opacity-50"
        >
          🔔 Send Test Notification
        </button>
      </div>
    </main>
  );
};

export default StudentDashboard;
