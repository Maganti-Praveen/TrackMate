import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Trash2 } from 'lucide-react';
import MapEditor from '../components/MapEditor';
import { api } from '../utils/api';
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
  const panelRef = useRef(null);

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
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
      {/* Column 1: Map Canvas (70% / Flex Grow) */}
      <div className="relative flex-1 bg-slate-900">
        <MapEditor
          key={editorKey}
          initialRoute={initialRoute}
          initialStops={initialStops}
          onSave={handleSaveRoute}
          panelContainerRef={panelRef}
        />
        {saving && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] rounded-full bg-white/90 px-4 py-1 text-sm font-semibold text-slate-800 shadow-lg backdrop-blur">
            Saving route...
          </div>
        )}
      </div>

      {/* Column 2: Sidebar (30% / Fixed 400px) */}
      <aside className="w-[400px] flex flex-col border-l border-slate-200 bg-white shadow-xl z-10">
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Section 1: Header & Route Name */}
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400 font-bold mb-1">Route Lab</p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Design the circuit</h1>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                Sketch path, add stops, and publish. Updates drivers instantly.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">Route Name</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-0"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="e.g. Sunrise Loop"
              />
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={resetEditor}
                >
                  Clear map
                </button>
                {selectedRoute && (
                  <button
                    type="button"
                    className="text-xs font-semibold uppercase tracking-wider text-indigo-500 hover:text-indigo-600 transition-colors"
                    onClick={() => duplicateRoute(selectedRoute)}
                  >
                    Clone Route
                  </button>
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Portal Target for Stops Panel */}
          {/* This div is where MapEditor will render the "Stops" list */}
          <div ref={panelRef} className="min-h-[100px]" />

          <hr className="border-slate-100" />

          {/* Section 3: Existing Routes */}
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">Existing Routes</span>
              <span className="text-xs font-medium text-slate-400">{routes.length} total</span>
            </div>

            {routes.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No routes saved yet.</p>}

            <div className="space-y-3">
              {routes.map((route) => (
                <div key={route._id} className="group rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition hover:bg-white hover:border-slate-200 hover:shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-700">{route.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">{route.stops?.length || 0} stops • {new Date(route.updatedAt || route.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                      onClick={() => startEdit(route)}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-500 hover:border-rose-100 transition"
                      onClick={() => askDelete(route)}
                      title="Delete Route"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <ConfirmDialog
        open={confirmState.open}
        title="Delete route"
        message={`This removes ${confirmState.target?.name} and its stops.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmState({ open: false, target: null })}
      />
    </div>
  );
};

export default ManageRoutes;
