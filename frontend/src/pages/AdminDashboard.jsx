import { useEffect, useState } from 'react';
import { api } from '../utils/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [trips, setTrips] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.get('/admin/dashboard').then((res) => setStats(res.data));
    api.get('/admin/trips').then((res) => setTrips(res.data));
    api.get('/admin/events').then((res) => setEvents(res.data));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl font-semibold text-slate-800">Admin Dashboard</h2>
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
            <h3 className="mb-4 text-lg font-semibold text-slate-700">Recent Stop Events</h3>
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
      </div>
    </main>
  );
};

export default AdminDashboard;
