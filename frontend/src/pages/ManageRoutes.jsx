import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { 
  Trash2, Navigation, MapPin, Copy, RotateCcw, 
  Route, Clock, Edit3, Layers, ChevronRight 
} from 'lucide-react';
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
      toast('Route name is required.', { icon: '⚠️' });
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
    toast('Editing a duplicate route', { icon: 'ℹ️' });
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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-slate-900/50">
      {/* Map Canvas */}
      <div className="relative flex-1 min-h-[50vh] lg:min-h-0">
        <MapEditor
          key={editorKey}
          initialRoute={initialRoute}
          initialStops={initialStops}
          onSave={handleSaveRoute}
          panelContainerRef={panelRef}
        />
        
        {/* Saving Overlay */}
        {saving && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-800/95 backdrop-blur-xl border border-indigo-500/30 shadow-2xl">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-white">Saving route...</span>
            </div>
          </div>
        )}

        {/* Mode Indicator */}
        <div className="absolute top-4 right-4 z-[500]">
          <div className={`px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur-xl border ${
            selectedRoute 
              ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' 
              : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
          }`}>
            {selectedRoute ? '✏️ Editing Mode' : '✨ Create Mode'}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-full lg:w-[400px] flex flex-col bg-slate-900/95 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-white/10 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          
          {/* Header */}
          <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-xl border-b border-white/5 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Route className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Route Designer</h1>
                <p className="text-sm text-slate-400">
                  Draw paths & manage stops
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-6">
            {/* Route Name Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-medium flex items-center gap-2">
                  <Edit3 className="w-3.5 h-3.5" />
                  Route Name
                </label>
                {selectedRoute && (
                  <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                    Editing
                  </span>
                )}
              </div>
              
              <div className="relative">
                <input
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder="Enter route name..."
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetEditor}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 hover:border-white/10 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
                {selectedRoute && (
                  <button
                    type="button"
                    onClick={() => duplicateRoute(selectedRoute)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/30 transition-all"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                )}
              </div>
            </div>

            {/* Stops Portal Target */}
            <div ref={panelRef} className="min-h-[80px]" />

            {/* Saved Routes Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs text-slate-400 uppercase tracking-wider font-medium flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" />
                  Saved Routes
                </h2>
                <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-lg">
                  {routes.length} {routes.length === 1 ? 'route' : 'routes'}
                </span>
              </div>

              {routes.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-800/30 border border-dashed border-white/10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-400">No routes created yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Use the map tools to draw your first route
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {routes.map((route) => (
                    <div 
                      key={route._id} 
                      className={`group relative p-4 rounded-2xl transition-all duration-200 border ${
                        selectedRoute?._id === route._id 
                          ? 'bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/10' 
                          : 'bg-slate-800/40 border-white/5 hover:border-white/15 hover:bg-slate-800/60'
                      }`}
                    >
                      {/* Active Indicator */}
                      {selectedRoute?._id === route._id && (
                        <div className="absolute -left-px top-4 bottom-4 w-1 rounded-r-full bg-gradient-to-b from-indigo-400 to-purple-500"></div>
                      )}

                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          selectedRoute?._id === route._id 
                            ? 'bg-indigo-500/20' 
                            : 'bg-slate-700/50'
                        }`}>
                          <Navigation className={`w-5 h-5 ${
                            selectedRoute?._id === route._id ? 'text-indigo-400' : 'text-slate-400'
                          }`} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white truncate mb-1">
                            {route.name}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {route.stops?.length || 0} stops
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(route.updatedAt || route.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(route)}
                            className="p-2 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 transition-all"
                            title="Edit route"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => askDelete(route)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-all"
                            title="Delete route"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Quick Edit Button */}
                      {selectedRoute?._id !== route._id && (
                        <button
                          onClick={() => startEdit(route)}
                          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-700/30 hover:bg-slate-700/50 border border-white/5 hover:border-white/10 transition-all"
                        >
                          Open in Editor
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title="Delete Route"
        message={`Are you sure you want to delete "${confirmState.target?.name}"? This will also remove all associated stops.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmState({ open: false, target: null })}
      />
    </div>
  );
};

export default ManageRoutes;
