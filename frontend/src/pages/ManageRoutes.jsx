import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import MapEditor from '../components/MapEditor';
import { api } from '../utils/api';
import GlassCard from '../components/GlassCard';
import ConfirmDialog from '../components/ConfirmDialog';

const ManageRoutes = () => {
  const [routeName, setRouteName] = useState('');
  const [saving, setSaving] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [editorKey, setEditorKey] = useState(Date.now());
  const [initialRoute, setInitialRoute] = useState(null);
  const [initialStops, setInitialStops] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, target: null });

  const loadRoutes = async () => {
    try {
      const res = await api.get('/routes');
      setRoutes(res.data);
    } catch (error) {
      toast.error('Unable to load routes');
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const resetEditor = () => {
    setRouteName('');
    setInitialRoute(null);
    setInitialStops([]);
    setSelectedRoute(null);
    setEditorKey(Date.now());
  };

  const handleSaveRoute = async (geojson, stops) => {
    if (!routeName.trim()) {
      toast.warn('Route name is required.');
      return;
    }

    setSaving(true);
    const payload = { name: routeName.trim(), geojson, stops };
    try {
      if (selectedRoute) {
        await api.put(`/routes/${selectedRoute._id}`, payload);
        toast.success('Route updated');
      } else {
        await api.post('/routes', payload);
        toast.success('Route saved');
      }
      resetEditor();
      loadRoutes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save route');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (route) => {
    setSelectedRoute(route);
    setRouteName(route.name);
    setInitialRoute(route.geojson);
    setInitialStops(route.stops || []);
    setEditorKey(Date.now());
  };

  const duplicateRoute = (route) => {
    if (!route) return;
    setSelectedRoute(null);
    setRouteName(`${route.name} Copy`);
    setInitialRoute(route.geojson);
    setInitialStops(route.stops || []);
    setEditorKey(Date.now());
    toast.info('Editing a duplicate route');
  };

  const askDelete = (route) => setConfirmState({ open: true, target: route });

  const confirmDelete = async () => {
    if (!confirmState.target) return;
    try {
      await api.delete(`/routes/${confirmState.target._id}`);
      toast.success('Route deleted');
      setConfirmState({ open: false, target: null });
      resetEditor();
      loadRoutes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete route');
    }
  };

  return (
    <main className="relative isolate min-h-screen px-6 py-10 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_15%,rgba(255,107,44,0.35),transparent_50%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.25),transparent_40%)]" />
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Route Lab</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Design the circuit</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Sketch the path, drop stops, reorder them and publish in one click. Switching routes automatically refreshes
              driver & student dashboards.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:w-72">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-200">Route name</label>
            <input
              className="rounded-2xl border border-white/20 bg-slate-950/50 px-4 py-2 text-sm text-white placeholder:text-slate-400"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="e.g. Sunrise Loop"
            />
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                className="flex-1 rounded-full border border-white/20 px-4 py-2 text-white transition hover:bg-white/10"
                onClick={resetEditor}
              >
                Reset canvas
              </button>
              {selectedRoute && (
                <button
                  type="button"
                  className="flex-1 rounded-full bg-brand px-4 py-2 text-white shadow-lg shadow-slate-900/30"
                  onClick={() => duplicateRoute(selectedRoute)}
                >
                  Clone in canvas
                </button>
              )}
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="admin-glow rounded-3xl p-4">
            <MapEditor key={editorKey} initialRoute={initialRoute} initialStops={initialStops} onSave={handleSaveRoute} />
            {saving && <p className="mt-3 text-sm text-slate-300">Saving route...</p>}
          </div>
          <div className="space-y-4">
            <GlassCard>
              <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Routes</p>
              <p className="mt-2 text-4xl font-semibold">{routes.length}</p>
              <p className="text-sm text-slate-400">blueprints on file</p>
            </GlassCard>
            <GlassCard className="h-[520px] overflow-y-auto">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Existing routes</p>
              {routes.length === 0 && <p className="mt-4 text-sm text-slate-300">No routes saved yet.</p>}
              <div className="mt-4 space-y-3">
                {routes.map((route) => (
                  <div key={route._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{route.name}</h3>
                        <p className="text-xs text-slate-400">{route.stops?.length || 0} stops</p>
                        <p className="text-[10px] uppercase tracking-[0.4em] text-slate-500">
                          {new Date(route.updatedAt || route.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className="badge bg-info-subtle text-info-emphasis">GeoJSON</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <button className="rounded-full border border-white/20 px-4 py-1 text-white" onClick={() => startEdit(route)}>
                        Edit
                      </button>
                      <button className="rounded-full border border-white/20 px-4 py-1 text-white" onClick={() => duplicateRoute(route)}>
                        Duplicate
                      </button>
                      <button
                        className="rounded-full border border-rose-500/50 px-4 py-1 text-rose-300"
                        onClick={() => askDelete(route)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmState.open}
        title="Delete route"
        message={`This removes ${confirmState.target?.name} and its stops.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmState({ open: false, target: null })}
      />
    </main>
  );
};

export default ManageRoutes;
