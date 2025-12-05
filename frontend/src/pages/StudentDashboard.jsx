import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentMap from '../components/StudentMap';
import NotificationToggle from '../components/NotificationToggle';
import Toast from '../components/Toast';
import GlassCard from '../components/GlassCard';
import { useSocket } from '../hooks/useSocket';
import { api } from '../utils/api';
import { formatETA, computeFallbackETA } from '../utils/etaUtils';
import {
  registerServiceWorker,
  requestNotificationPermission,
  showPageNotification
} from '../utils/notifications';
import { useAuth } from '../hooks/useAuth';

const TOKEN_KEY = 'tm_token';
const NOTIFICATION_PREF_KEY = 'tm_student_notifications';
const TOAST_DURATION_MS = 6000;

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
  const [toasts, setToasts] = useState([]);
  const toastTimeouts = useRef({});
  const subscribedTripRef = useRef(null);

  const persistNotificationPreference = useCallback((value) => {
    if (typeof window === 'undefined') return;
    if (value === null) {
      localStorage.removeItem(NOTIFICATION_PREF_KEY);
      return;
    }
    localStorage.setItem(NOTIFICATION_PREF_KEY, value ? 'true' : 'false');
  }, []);

  useEffect(() => () => {
    Object.values(toastTimeouts.current).forEach((timeoutId) => clearTimeout(timeoutId));
  }, []);

  const pushToast = useCallback((toast) => {
    const globalCrypto =
      typeof crypto !== 'undefined'
        ? crypto
        : typeof window !== 'undefined' && window.crypto
          ? window.crypto
          : undefined;
    const id = globalCrypto?.randomUUID ? globalCrypto.randomUUID() : `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [{ id, ...toast }, ...prev].slice(0, 3));
    toastTimeouts.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
      delete toastTimeouts.current[id];
    }, toast.duration ?? TOAST_DURATION_MS);
  }, []);

  const dismissToast = useCallback((id) => {
    if (toastTimeouts.current[id]) {
      clearTimeout(toastTimeouts.current[id]);
      delete toastTimeouts.current[id];
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const maybeNotify = useCallback(
    (title, options = {}) => {
      if (!notificationsEnabled || permission !== 'granted') return;
      showPageNotification(title, {
        body: options.body,
        tag: options.tag || 'trackmate-update',
        icon: options.icon || '/favicon.ico',
        data: { url: '/student' }
      });
    },
    [notificationsEnabled, permission]
  );

  const fetchProfile = useCallback(async () => {
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
    registerServiceWorker();
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

      if (nextEta.value <= 5 * 60 * 1000) {
        const readable = formatETA(nextEta.value);
        pushToast({
          title: 'Bus is approaching',
          message: `${nextEta.stopName || 'Your stop'} in ${readable}`,
          type: 'info'
        });
        maybeNotify('Bus approaching', {
          body: `${nextEta.stopName || 'Your stop'} in ${readable}`,
          tag: `eta-${targetStopId}`
        });
      }
    },
    [maybeNotify, pushToast, stopInfo]
  );

  const handleStopEvent = useCallback(
    (payload, type) => {
      if (!payload) return;
      const targetStopId = stopInfo?._id || stopInfo?.id;
      const isStudentStop = !targetStopId || targetStopId === (payload.stopId || payload?.stop?._id);
      const event = {
        type,
        stopName: payload?.stop?.name || payload.stopName || `Stop ${payload.stopIndex ?? ''}`,
        timestamp: payload.timestamp || Date.now()
      };
      setHistoryEvents((prev) => [event, ...prev].slice(0, 5));

      const toastTitle = type === 'ARRIVED' ? 'Bus arrived' : 'Bus departed';
      pushToast({ title: toastTitle, message: `${event.stopName}`, type: type === 'ARRIVED' ? 'success' : 'info' });

      const notifyTitle = type === 'ARRIVED' ? `Arrived: ${event.stopName}` : `Departed: ${event.stopName}`;
      const notifyBody = isStudentStop
        ? `${event.stopName} is your stop. Head out now!`
        : `${event.stopName} update.`;
      maybeNotify(notifyTitle, {
        body: notifyBody,
        tag: `${type.toLowerCase()}-${payload.stopId || payload?.stop?._id || event.stopName}`
      });
    },
    [maybeNotify, pushToast, stopInfo]
  );

  const handleSubscriptionAck = useCallback(
    (payload) => {
      if (!payload?.tripId) return;
      setStatusMessage('Connected to live trip feed.');
      if (payload?.source === 'legacy:join') return;
      pushToast({
        title: 'Live tracking active',
        message: 'Realtime bus alerts are enabled.',
        type: 'success',
        duration: 4000
      });
    },
    [pushToast]
  );

  const handleSubscriptionError = useCallback(
    (payload) => {
      const message = payload?.message || 'Unable to join live trip room.';
      setStatusMessage(message);
      pushToast({ title: 'Live updates unavailable', message, type: 'warning' });
    },
    [pushToast]
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

  const { socket, isConnected } = useSocket(socketHandlers);

  useEffect(() => {
    if (!socket || !tripId) {
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
  }, [socket, tripId]);

  const enableNotifications = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result !== 'granted') {
      pushToast({ title: 'Permission needed', message: 'Allow notifications to stay informed.', type: 'warning' });
      setNotificationsEnabled(false);
      persistNotificationPreference(null);
      return;
    }
    await registerServiceWorker();
    setNotificationsEnabled(true);
    persistNotificationPreference(true);
    pushToast({ title: 'Notifications enabled', message: 'We will alert you about bus updates.', type: 'success' });
  }, [persistNotificationPreference, pushToast]);

  const disableNotifications = useCallback(() => {
    setNotificationsEnabled(false);
    persistNotificationPreference(false);
    pushToast({ title: 'Notifications disabled', message: 'You will not receive alerts.', type: 'info' });
  }, [persistNotificationPreference, pushToast]);

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

      <GlassCard className="space-y-6">
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
        </dl>
      </GlassCard>

      <GlassCard>
        <StudentMap busPosition={busPosition} stopPosition={stopPosition} />
      </GlassCard>

      <GlassCard>
        <NotificationToggle
          enabled={notificationsEnabled}
          permission={permission}
          onEnable={enableNotifications}
          onDisable={disableNotifications}
        />
      </GlassCard>

      <GlassCard>
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
      </GlassCard>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
};

export default StudentDashboard;
