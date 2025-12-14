import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, Navigation, Bell, BellOff, Info } from 'lucide-react';
import StudentMap from '../components/StudentMap';
import NotificationToggle from '../components/NotificationToggle';
import { useSocket } from '../hooks/useSocket';
import { api } from '../utils/api';
import { formatETA, computeFallbackETA } from '../utils/etaUtils';
import { useAuth } from '../hooks/useAuth';

const TOKEN_KEY = 'tm_token';
const NOTIFICATION_PREF_KEY = 'tm_student_notifications';
// Hardcoded Public Key (In production, serve this via API)
const VAPID_PUBLIC_KEY = 'BFHhjifeev0Ff44ZnY49dHbee6LACpUub5IzN6OMaoDJuac2f0uddLeMXbbggQUpaUvDdv-LiXBXM9gJpfw07dg';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const normalizeLocation = (location) => {
  if (!location) return null;
  const lat =
    location.lat ??
    location.latitude ??
    location?.coords?.lat ??
    location?.coords?.latitude ??
    location?.location?.lat ??
    location?.location?.latitude;
  const lng =
    location.lng ??
    location.longitude ??
    location?.coords?.lng ??
    location?.coords?.longitude ??
    location?.location?.lng ??
    location?.location?.longitude;
  if (typeof lat === 'number' && typeof lng === 'number') {
    return { lat, lng };
  }
  return null;
};

const normalizeStop = (profileData = {}) => {
  const stop =
    profileData?.stop ||
    profileData?.assignedStop ||
    profileData?.assignment?.stop ||
    profileData?.currentStop;
  return stop || null;
};

const normalizeBus = (profileData = {}) => profileData?.bus || profileData?.assignment?.bus || null;

const deriveTripId = (profileData = {}) => {
  const trip =
    profileData?.activeTrip ||
    profileData?.currentTrip ||
    profileData?.assignment?.trip ||
    profileData?.trip;
  return profileData?.currentTripId || profileData?.tripId || trip?._id || trip?.id || null;
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState(user);
  const [busPosition, setBusPosition] = useState(null);
  const [stopInfo, setStopInfo] = useState(null);
  const [tripId, setTripId] = useState(null);
  const [journey, setJourney] = useState(null); // { currentStop, nextStop, progress }
  const [eta, setEta] = useState(null);
  const [historyEvents, setHistoryEvents] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(NOTIFICATION_PREF_KEY) === 'true';
  });
  const [permission, setPermission] = useState(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'default';
    return Notification.permission;
  });

  const subscribedTripRef = useRef(null);

  const persistNotificationPreference = useCallback((value) => {
    if (typeof window === 'undefined') return;
    if (value === null) {
      localStorage.removeItem(NOTIFICATION_PREF_KEY);
      return;
    }
    localStorage.setItem(NOTIFICATION_PREF_KEY, value ? 'true' : 'false');
  }, []);

  const subscribeToPush = async () => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token || !user) {
      toast.error('Please log in to enable notifications');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Explicitly pass header just in case, though interceptor handles it
      await api.post('/notifications/subscribe', subscription, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Push subscription saved.');
      return true;
    } catch (err) {
      console.error('Push Subscription Error:', err);
      if (err.response?.status === 401) {
        setNotificationsEnabled(false);
        persistNotificationPreference(null);
        toast.error('Session expired. Please login again.');
      }
      return false;
    }
  };

  const fetchProfile = useCallback(async () => {
    console.log('[Dashboard] Fetching full profile...');
    setLoading(true);
    setError(null);
    try {
      const response = await api
        .get('/students/me')
        .catch(() => api.get('/auth/me'));
      const data = response.data;
      const nextStop = normalizeStop(data);
      const nextBus = normalizeBus(data);
      const extendedProfile = {
        id: user?.id,
        username: user?.username,
        role: user?.role,
        assignmentId: data?._id,
        bus: nextBus || data?.bus,
        stop: nextStop || data?.stop
      };
      setProfile(extendedProfile);
      setStopInfo(nextStop);
      const initialBusPosition = normalizeLocation(
        nextBus?.lastKnownLocation || nextBus?.location || data?.lastKnownLocation
      );
      setBusPosition(initialBusPosition || null);

      let resolvedTripId = deriveTripId(data);
      let nextStatus = 'Live updates ready.';

      try {
        const tripResponse = await api.get('/students/trip');
        const tripData = tripResponse.data;
        if (tripData) {
          resolvedTripId = tripData._id || tripData.id || resolvedTripId;
          const liveLocation = normalizeLocation(tripData?.bus?.lastKnownLocation);
          if (liveLocation) {
            setBusPosition(liveLocation);
          }
          setJourney({
            currentStop: tripData.currentStop,
            nextStop: tripData.nextStop,
            progress: tripData.progress
          });
        } else if (!resolvedTripId) {
          nextStatus = 'Waiting for a driver to start your trip.';
        }
      } catch (tripError) {
        console.warn('Unable to load live trip', tripError);
        if (!resolvedTripId) {
          nextStatus = 'Waiting for a driver to start your trip.';
        }
      }

      try {
        const etaResponse = await api.get('/students/eta');
        const etaMinutes = etaResponse?.data?.etaMinutes;
        if (typeof etaMinutes === 'number') {
          setEta({ value: etaMinutes * 60 * 1000, source: 'server', updatedAt: Date.now() });
        }
      } catch (etaError) {
        console.warn('Unable to load stop ETA', etaError);
      }

      setTripId(resolvedTripId);
      if (Array.isArray(data?.recentEvents)) {
        const normalizedHistory = data.recentEvents.slice(0, 5).map((event) => ({
          type: event.type || event.status || 'INFO',
          stopName: event.stopName || event?.stop?.name || 'Stop',
          timestamp: event.timestamp || Date.now()
        }));
        setHistoryEvents(normalizedHistory);
      }
      setStatusMessage(nextStatus);
    } catch (err) {
      setError('Unable to load your assignment. Contact the transport admin.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    // Simple check if supported
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.error('SW registration failed:', err));
    }
    fetchProfile();
  }, [fetchProfile, navigate]);

  const stopPosition = stopInfo
    ? normalizeLocation(stopInfo)
    : null;

  const handleLocationUpdate = useCallback(
    (payload) => {
      if (!payload) return;
      if (tripId && payload.tripId && payload.tripId !== tripId) return;
      setBusPosition({ lat: payload.lat, lng: payload.lng });
      setStatusMessage('Live GPS update received.');
      if (!eta || eta?.source !== 'server') {
        const fallback = computeFallbackETA(
          { lat: payload.lat, lng: payload.lng },
          stopPosition
        );
        if (fallback) {
          setEta({ value: fallback, source: 'fallback', updatedAt: Date.now() });
        }
      }
    },
    [eta, stopPosition, tripId]
  );

  const handleEtaUpdate = useCallback(
    (payload) => {
      if (!payload || !stopInfo) return;
      const targetStopId = stopInfo?._id || stopInfo?.id;
      const parseEta = (entry) => {
        if (!entry) return null;
        const matches = !targetStopId ||
          targetStopId === (entry.stopId || entry?.stop?._id || entry?.stopId);
        if (!matches) return null;
        const value =
          entry.etaMs ??
          (typeof entry.etaSeconds === 'number' ? entry.etaSeconds * 1000 : null) ??
          (typeof entry.etaMinutes === 'number' ? entry.etaMinutes * 60 * 1000 : null);
        if (value == null) return null;
        return { value, stopName: entry?.stopName || entry?.stop?.name || stopInfo?.name };
      };

      let nextEta = parseEta(payload);
      if (!nextEta && Array.isArray(payload?.etas)) {
        nextEta = payload.etas.reduce((acc, entry) => acc || parseEta(entry), null);
      }
      if (!nextEta) return;

      setEta({ value: nextEta.value, source: 'server', updatedAt: Date.now() });
      setStatusMessage('ETA update received from server.');

      if (nextEta.value <= 5 * 60 * 1000 && nextEta.value > 0) {
        const readable = formatETA(nextEta.value);
        toast(`Bus is approaching: ${readable}`, {
          icon: '🚌',
          duration: 6000,
          id: 'eta-toast' // prevent duplicates
        });
      }
    },
    [stopInfo]
  );

  const handleStopEvent = useCallback(
    (payload, type) => {
      console.log(`%c[Socket Event] ${type}`, 'color: yellow; font-weight: bold;', payload);
      if (!payload) return;

      const event = {
        type,
        stopName: payload?.stop?.name || payload.stopName || `Stop ${payload.stopIndex ?? ''}`,
        timestamp: payload.timestamp || Date.now()
      };

      // Add to timeline (keep only last 5)
      setHistoryEvents((prev) => {
        const updated = [event, ...prev].slice(0, 5);
        console.log('[Timeline Updated]', updated);
        return updated;
      });

      const toastTitle = type === 'ARRIVED' ? 'Bus Arrived' : 'Bus Departed';
      if (type === 'ARRIVED') {
        toast.success(`${toastTitle}: ${event.stopName}`);
      } else {
        toast(`${toastTitle}: ${event.stopName}`, { icon: '🛑' });
      }

      // Refresh journey progress on ANY stop event to keep UI synced
      fetchProfile();
    },
    [fetchProfile]
  );

  const handleSubscriptionAck = useCallback(
    (payload) => {
      if (!payload?.tripId) return;
      setStatusMessage('Connected to live trip feed.');
      if (payload?.source === 'legacy:join') return;
      toast.success('Live tracking active');
    },
    []
  );

  const handleSubscriptionError = useCallback(
    (payload) => {
      const message = payload?.message || 'Unable to join live trip room.';
      setStatusMessage(message);
      toast.error(message);
    },
    []
  );

  const socketHandlers = useMemo(
    () => ({
      'trip:location_update': handleLocationUpdate,
      'trip:eta_update': handleEtaUpdate,
      'trip:stop_arrived': (payload) => handleStopEvent(payload, 'ARRIVED'),
      'trip:stop_left': (payload) => handleStopEvent(payload, 'LEFT'),
      'trip:subscribed': handleSubscriptionAck,
      'trip:subscription_error': handleSubscriptionError
    }),
    [handleEtaUpdate, handleLocationUpdate, handleStopEvent, handleSubscriptionAck, handleSubscriptionError]
  );

  const { socket, isConnected, isAuthenticated } = useSocket(socketHandlers);

  useEffect(() => {
    if (!socket || !tripId || !isAuthenticated) {
      return undefined;
    }

    socket.emit('student:subscribe', { tripId });
    subscribedTripRef.current = tripId;

    return () => {
      socket.emit('student:unsubscribe', { tripId });
      if (subscribedTripRef.current === tripId) {
        subscribedTripRef.current = null;
      }
    };
  }, [socket, tripId, isAuthenticated]);

  const enableNotifications = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications not supported');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== 'granted') {
      toast.error('Permission needed for alerts');
      setNotificationsEnabled(false);
      persistNotificationPreference(null);
      return;
    }

    // Register Service Worker and Subscribe to Push
    const success = await subscribeToPush();
    if (success) {
      setNotificationsEnabled(true);
      persistNotificationPreference(true);
      toast.success('Notifications enabled');
    } else {
      toast.error('Failed to subscribe to push');
    }
  }, [persistNotificationPreference]);

  const disableNotifications = useCallback(() => {
    setNotificationsEnabled(false);
    persistNotificationPreference(false);
    toast('Notifications disabled', { icon: '🔕' });
  }, [persistNotificationPreference]);

  const formattedEta = eta?.value ? formatETA(eta.value) : '—';

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6">
        <p className="text-slate-500">Loading your dashboard…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6">
        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10 text-white">
      <header className="space-y-1 text-white">
        <p className="text-xs uppercase tracking-[0.4em] text-white/60">Live student view</p>
        <h1 className="text-3xl font-semibold text-white">Track your ride</h1>
        <p className="text-sm text-white/70">Stay synced with your bus, stop ETA, and notifications.</p>
      </header>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 shadow-sm space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/60">Bus</p>
            <p className="text-2xl font-semibold">{profile?.bus?.name || 'Not assigned'}</p>
            <p className="text-sm text-white/60">Trip ID: {tripId || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-white/60">Your stop</p>
            <p className="text-2xl font-semibold">{stopInfo?.name || 'Not assigned'}</p>
            <p className="text-sm text-white/60">ETA: {formattedEta}</p>
          </div>
        </div>
        <dl className="grid gap-6 text-sm text-white/80 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-widest text-white/50">Socket</dt>
            <dd className="text-base font-semibold">{isConnected ? 'Connected' : 'Disconnected'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-white/50">Status</dt>
            <dd className="text-base font-semibold">{statusMessage || 'Waiting for live data'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-white/50">Notifications</dt>
            <dd className="text-base font-semibold">{notificationsEnabled ? 'Enabled' : 'Disabled'} ({permission})</dd>
          </div>

          {/* Journey Progress */}
          {tripId && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 shadow-sm">
              <header className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/60">Live Journey</p>
                  <h2 className="text-xl font-semibold text-white">Route Progress</h2>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-indigo-400">
                    {journey?.progress?.percentage ?? 0}%
                  </span>
                  <span className="text-xs text-white/40 block">completed</span>
                </div>
              </header>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-white/5 p-4 border border-white/5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    <p className="text-xs uppercase tracking-widest text-white/50">Current / Last Stop</p>
                  </div>
                  <p className="text-lg font-medium text-white">{journey?.currentStop?.name || 'Start'}</p>
                  <p className="text-sm text-white/40">Stop #{journey?.currentStop?.seq ?? 0}</p>
                </div>

                <div className="rounded-lg bg-white/5 p-4 border border-white/5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-2 w-2 rounded-full bg-indigo-400"></div>
                    <p className="text-xs uppercase tracking-widest text-white/50">Up Next</p>
                  </div>
                  <p className="text-lg font-medium text-white">{journey?.nextStop?.name || 'End of Route'}</p>
                  <p className="text-sm text-white/40">Stop #{journey?.nextStop?.seq ?? ((journey?.currentStop?.seq ?? 0) + 1)}</p>
                </div>
              </div>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 shadow-sm">
        <StudentMap busPosition={busPosition} stopPosition={stopPosition} />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 shadow-sm">
        <NotificationToggle
          enabled={notificationsEnabled}
          permission={permission}
          onEnable={enableNotifications}
          onDisable={disableNotifications}
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 shadow-sm">
        <header className="mb-4">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">Timeline</p>
          <h2 className="text-xl font-semibold text-white">Recent stop events</h2>
          <p className="text-sm text-white/70">We keep the last five updates for quick review.</p>
        </header>
        <ul className="space-y-3 text-sm">
          {historyEvents.length ? (
            historyEvents.map((event, idx) => (
              <li key={`${event.timestamp}-${idx}`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="font-medium text-white">
                  {event.type === 'ARRIVED'
                    ? 'Arrived at'
                    : event.type === 'LEFT'
                      ? 'Left'
                      : event.type}{' '}
                  {event.stopName || 'stop'}
                </p>
                <p className="text-xs text-white/70">{new Date(event.timestamp).toLocaleTimeString()}</p>
              </li>
            ))
          ) : (
            <li className="text-white/60">No events yet. Stay tuned!</li>
          )}
        </ul>
      </div>
    </main>
  );
};

export default StudentDashboard;
