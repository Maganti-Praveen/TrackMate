import { useEffect, useState, useMemo } from 'react';
import { api } from '../utils/api';
import { useSocket } from '../hooks/useSocket';

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [trips, setTrips] = useState([]);
  const [events, setEvents] = useState([]);
  const [sosAlert, setSosAlert] = useState(null);
  const [visitorCount, setVisitorCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clearing, setClearing] = useState(false);

  const handleClearEvents = async () => {
    if (!window.confirm('Are you sure you want to clear all stop events?')) return;
    setClearing(true);
    try {
      await api.delete('/admin/events');
      setEvents([]);
    } catch (err) {
      console.error('Failed to clear events:', err);
      alert('Failed to clear events');
    } finally {
      setClearing(false);
    }
  };

  const socketHandlers = useMemo(() => ({
    'trip:sos': (payload) => setSosAlert(payload),
    'stats:live_visitors': (count) => setVisitorCount(count),
    'admin:joined': () => console.log('Joined admin socket room')
  }), []);

  const { socket, isConnected } = useSocket(socketHandlers);

  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('admin:join');
    }
  }, [socket, isConnected]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, tripsRes, eventsRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/trips'),
          api.get('/admin/events')
        ]);
        setStats(statsRes.data);
        setTrips(tripsRes.data);
        setEvents(eventsRes.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError(err.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      {sosAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-red-600 p-6 text-white shadow-2xl animate-pulse cursor-pointer">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-white/20 p-4">
                <span className="text-4xl">🚨</span>
              </div>
              <h2 className="text-3xl font-bold uppercase tracking-widest">Emergency Alert</h2>
              <p className="text-lg font-medium">{sosAlert.message}</p>
              <p className="text-sm opacity-80">
                Trip ID: {sosAlert.tripId}
              </p>
              <button
                className="mt-4 rounded-lg bg-white px-6 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                onClick={() => setSosAlert(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl">

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-800">Admin Dashboard</h2>
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm border border-slate-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium text-slate-600">{visitorCount} Live Visitors</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="mt-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="mt-8 rounded-lg bg-red-50 border border-red-200 p-4 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-sm text-red-500 hover:underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Content - only show when not loading and no error */}
        {!loading && !error && (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-4">
          {['busCount', 'driverCount', 'studentCount', 'activeTrips'].map((key) => (
            <div key={key} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm uppercase tracking-wide text-slate-500">{key}</p>
              <p className="text-2xl font-bold text-brand">{stats[key] ?? '-'}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-700">Active Trips</h3>
            <ul className="space-y-3 text-sm">
              {trips.map((trip) => (
                <li key={trip._id} className="rounded border border-slate-100 p-3">
                  <p className="font-medium text-slate-800">{trip.bus?.name}</p>
                  <p className="text-slate-500">Driver: {trip.driver?.name || trip.driver?.username}</p>
                  <p className="text-xs text-slate-400">Route: {trip.route?.name}</p>
                </li>
              ))}
              {!trips.length && <p className="text-slate-500">No active trips</p>}
            </ul>
          </div>
          <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-700">Recent Stop Events</h3>
              {events.length > 0 && (
                <button
                  onClick={handleClearEvents}
                  disabled={clearing}
                  className="px-3 py-1 text-xs font-medium text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50"
                >
                  {clearing ? 'Clearing...' : 'Clear All'}
                </button>
              )}
            </div>
            <ul className="space-y-3 text-sm">
              {events.map((event) => (
                <li key={event._id} className="border-b border-slate-100 pb-2">
                  <p className="font-medium text-slate-700">{event.stop?.name}</p>
                  <p className="text-slate-500">
                    Status: {event.status} · ETA snapshot: {event.etaMinutes} mins
                  </p>
                  <p className="text-xs text-slate-400">{new Date(event.timestamp).toLocaleString()}</p>
                </li>
              ))}
              {!events.length && <p className="text-slate-500">No events</p>}
            </ul>
          </div>
        </section>
          </>
        )}
      </div>
    </main>
  );
};

export default AdminDashboard;
