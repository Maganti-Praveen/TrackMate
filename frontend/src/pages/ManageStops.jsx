import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../utils/api';
import GlassCard from '../components/GlassCard';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';

const defaultStopForm = (routeId = '') => ({
  route: routeId,
  name: '',
  latitude: '',
  longitude: '',
  sequence: 1,
  averageTravelMinutes: 2
});

const ManageStops = () => {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [stops, setStops] = useState([]);
  const [form, setForm] = useState(() => defaultStopForm());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingStop, setEditingStop] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, target: null });

  const loadRoutes = async () => {
    try {
      const res = await api.get('/routes');
      setRoutes(res.data);
      if (!selectedRoute && res.data[0]) {
        selectRoute(res.data[0]._id);
      }
    } catch (error) {
      toast.error('Unable to load routes');
    }
  };

  const selectRoute = (routeId) => {
    setSelectedRoute(routeId);
    setForm(defaultStopForm(routeId));
    if (routeId) {
      api
        .get(`/stops/${routeId}`)
        .then((res) => setStops(res.data))
        .catch(() => setStops([]));
    } else {
      setStops([]);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedRoute) {
      toast.warn('Pick a route first');
      return;
    }

    const payload = {
      ...form,
      route: selectedRoute,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      sequence: Number(form.sequence),
      averageTravelMinutes: Number(form.averageTravelMinutes) || 2
    };

    try {
      await api.post('/stops', payload);
      toast.success('Stop created');
      setForm((prev) => ({ ...defaultStopForm(selectedRoute), sequence: Number(prev.sequence) + 1 }));
      selectRoute(selectedRoute);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create stop');
    }
  };

  const openEdit = (stop) => {
    setEditingStop(stop);
    setForm({
      route: stop.route,
      name: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      sequence: stop.sequence,
      averageTravelMinutes: stop.averageTravelMinutes
    });
    setDrawerOpen(true);
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!editingStop) return;
    const payload = {
      ...form,
      route: selectedRoute,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      sequence: Number(form.sequence),
      averageTravelMinutes: Number(form.averageTravelMinutes) || 2
    };
    try {
      await api.put(`/stops/${editingStop._id}`, payload);
      toast.success('Stop updated');
      setDrawerOpen(false);
      setEditingStop(null);
      setForm(defaultStopForm(selectedRoute));
      selectRoute(selectedRoute);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update stop');
    }
  };

  const askDelete = (stop) => setConfirmState({ open: true, target: stop });

  const confirmDelete = async () => {
    if (!confirmState.target) return;
    try {
      await api.delete(`/stops/${confirmState.target._id}`);
      toast.success('Stop deleted');
      setConfirmState({ open: false, target: null });
      selectRoute(selectedRoute);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete stop');
    }
  };

  return (
    <main className="relative isolate min-h-screen px-6 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(45,212,191,0.25),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.2),transparent_40%)]" />
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Stops Studio</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Micro-manage pickup order</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Build precise arrival estimates by editing coordinates, order and dwell time for each stop on a route.
            </p>
          </div>
          <label className="text-xs uppercase tracking-[0.3em] text-slate-300">
            Active route
            <select
              className="mt-2 min-w-[220px] rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white"
              value={selectedRoute}
              onChange={(e) => selectRoute(e.target.value)}
            >
              {routes.map((route) => (
                <option key={route._id} value={route._id}>
                  {route.name}
                </option>
              ))}
            </select>
          </label>
        </header>

        <section className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <GlassCard>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">New stop</p>
            <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
              <input
                name="name"
                placeholder="Stop name"
                className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-400"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="latitude"
                  placeholder="Latitude"
                  className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-400"
                  value={form.latitude}
                  onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value }))}
                  required
                />
                <input
                  name="longitude"
                  placeholder="Longitude"
                  className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-400"
                  value={form.longitude}
                  onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="sequence"
                  type="number"
                  placeholder="Sequence"
                  className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-400"
                  value={form.sequence}
                  onChange={(e) => setForm((prev) => ({ ...prev, sequence: e.target.value }))}
                  required
                />
                <input
                  name="averageTravelMinutes"
                  type="number"
                  placeholder="Avg minutes"
                  className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-400"
                  value={form.averageTravelMinutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, averageTravelMinutes: e.target.value }))}
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/30"
              >
                Add stop
              </button>
            </form>
          </GlassCard>

          <GlassCard>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Stops ({stops.length})</p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm text-white/90">
                <thead className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  <tr>
                    <th className="py-2">#</th>
                    <th>Name</th>
                    <th>Coordinates</th>
                    <th>ETA</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {stops.map((stop) => (
                    <tr key={stop._id} className="border-t border-white/10">
                      <td className="py-3 text-slate-400">{stop.sequence}</td>
                      <td className="font-semibold">{stop.name}</td>
                      <td className="text-xs text-slate-300">
                        {Number.isFinite(Number(stop.latitude)) ? Number(stop.latitude).toFixed(4) : '—'},{' '}
                        {Number.isFinite(Number(stop.longitude)) ? Number(stop.longitude).toFixed(4) : '—'}
                      </td>
                      <td className="text-xs text-slate-300">{stop.averageTravelMinutes} min</td>
                      <td>
                        <div className="flex gap-2 text-xs">
                          <button className="text-brand" onClick={() => openEdit(stop)}>
                            Edit
                          </button>
                          <button className="text-rose-300" onClick={() => askDelete(stop)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {stops.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No stops yet.</p>}
            </div>
          </GlassCard>
        </section>
      </div>

      <Drawer
        isOpen={drawerOpen}
        title="Edit stop"
        subtitle="Adjust order, coordinates or dwell time"
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="rounded-full px-4 py-2 text-sm text-slate-500" onClick={() => setDrawerOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="stop-edit-form" className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white">
              Save stop
            </button>
          </div>
        }
      >
        <form id="stop-edit-form" className="space-y-4" onSubmit={handleUpdate}>
          <label className="block text-sm font-semibold text-slate-600">
            Name
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm font-semibold text-slate-600">
            Latitude
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
              value={form.latitude}
              onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm font-semibold text-slate-600">
            Longitude
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
              value={form.longitude}
              onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm font-semibold text-slate-600">
            Sequence
            <input
              type="number"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
              value={form.sequence}
              onChange={(e) => setForm((prev) => ({ ...prev, sequence: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm font-semibold text-slate-600">
            Avg minutes
            <input
              type="number"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
              value={form.averageTravelMinutes}
              onChange={(e) => setForm((prev) => ({ ...prev, averageTravelMinutes: e.target.value }))}
            />
          </label>
        </form>
      </Drawer>

      <ConfirmDialog
        open={confirmState.open}
        title="Delete stop"
        message={`Remove ${confirmState.target?.name} from this route?`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmState({ open: false, target: null })}
      />
    </main>
  );
};

export default ManageStops;
