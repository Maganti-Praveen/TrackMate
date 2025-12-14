import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../utils/api';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';

const createEmptyBus = () => ({
  name: '',
  numberPlate: '',
  capacity: 40,
  route: '',
  driver: ''
});

const ManageBuses = () => {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState(() => createEmptyBus());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, target: null });
  const [search, setSearch] = useState('');
  const [routeFilter, setRouteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadBuses = async () => {
    try {
      const res = await api.get('/buses');
      setBuses(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load buses');
    }
  };

  const loadRoutesAndDrivers = async () => {
    try {
      const [routesRes, driversRes] = await Promise.all([api.get('/routes'), api.get('/admin/drivers')]);
      setRoutes(routesRes.data);
      setDrivers(driversRes.data);
    } catch (error) {
      toast.error('Unable to load supporting data');
    }
  };

  useEffect(() => {
    loadBuses();
    loadRoutesAndDrivers();
  }, []);

  const openCreate = () => {
    setEditingBus(null);
    setForm(createEmptyBus());
    setDrawerOpen(true);
  };

  const openEdit = (bus) => {
    setEditingBus(bus);
    setForm({
      name: bus.name,
      numberPlate: bus.numberPlate,
      capacity: bus.capacity,
      route: bus.route?._id || bus.route || '',
      driver: bus.driver?._id || bus.driver || ''
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      numberPlate: form.numberPlate.trim().toUpperCase(),
      capacity: Number(form.capacity) || 1
    };
    if (form.route) payload.route = form.route;
    if (form.driver) payload.driver = form.driver;

    try {
      if (editingBus) {
        await api.put(`/buses/${editingBus._id}`, payload);
        toast.success('Bus updated');
      } else {
        await api.post('/buses', payload);
        toast.success('Bus added');
      }
      setDrawerOpen(false);
      setForm(createEmptyBus());
      setEditingBus(null);
      loadBuses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save bus');
    }
  };

  const askDelete = (bus) => setConfirmState({ open: true, target: bus });

  const confirmDelete = async () => {
    if (!confirmState.target) return;
    try {
      await api.delete(`/buses/${confirmState.target._id}`);
      toast.success('Bus removed');
      setConfirmState({ open: false, target: null });
      loadBuses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete bus');
    }
  };

  const filteredBuses = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return buses.filter((bus) => {
      const matchesSearch = needle
        ? [bus.name, bus.numberPlate, bus.driver?.name, bus.route?.name].some((value) => value?.toLowerCase().includes(needle))
        : true;
      const routeId = bus.route?._id || bus.route;
      const matchesRoute = routeFilter === 'all' ? true : routeId === routeFilter;
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'assigned'
            ? Boolean(bus.route)
            : !bus.route;
      return matchesSearch && matchesRoute && matchesStatus;
    });
  }, [buses, search, routeFilter, statusFilter]);

  const totalCapacity = buses.reduce((sum, bus) => sum + (bus.capacity || 0), 0);
  const activeBuses = buses.filter((bus) => bus.route).length;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Fleet Studio</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Bus command board</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Balance capacity, routes and drivers from a single glass dashboard. Every edit updates the realtime
              locations and student assignments.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold uppercase tracking-wide text-slate-900 shadow-lg shadow-slate-900/30 transition hover:-translate-y-0.5"
          >
            New bus
          </button>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.5em] text-slate-500">Buses</p>
            <p className="mt-2 text-4xl font-semibold text-slate-800">{buses.length}</p>
            <p className="text-sm text-slate-500">{activeBuses} currently routed</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.5em] text-slate-500">Capacity</p>
            <p className="mt-2 text-4xl font-semibold text-slate-800">{totalCapacity}</p>
            <p className="text-sm text-slate-500">total seats available</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.5em] text-slate-500">Search</p>
            <input
              type="search"
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              placeholder="Search by name, route or driver"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 text-slate-900 lg:grid-cols-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="text-sm">
            <span className="text-xs uppercase tracking-[0.4em] text-slate-500">Route filter</span>
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-900"
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
            >
              <option value="all">All routes</option>
              {routes.map((route) => (
                <option key={route._id} value={route._id}>
                  {route.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-xs uppercase tracking-[0.4em] text-slate-500">Assignment</span>
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-900"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All buses</option>
              <option value="assigned">Has route</option>
              <option value="idle">Idle</option>
            </select>
          </label>
          <div className="space-y-2 text-sm">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Quick actions</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setRouteFilter('all');
                  setStatusFilter('idle');
                }}
                className="rounded-full border border-slate-200 px-4 py-1 text-slate-600 transition hover:bg-slate-50"
              >
                Show idle
              </button>
              <button
                type="button"
                onClick={() => {
                  setRouteFilter('all');
                  setStatusFilter('assigned');
                }}
                className="rounded-full border border-slate-200 px-4 py-1 text-slate-600 transition hover:bg-slate-50"
              >
                Show routed
              </button>
            </div>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          {filteredBuses.map((bus) => (
            <div key={bus._id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{bus.numberPlate}</p>
                  <h3 className="mt-2 text-3xl font-semibold text-slate-800">{bus.name}</h3>
                  <p className="text-sm text-slate-500">Capacity {bus.capacity}</p>
                </div>
                <span
                  className={`badge ${bus.route ? 'bg-info-subtle text-info-emphasis' : 'bg-warning-subtle text-warning-emphasis'}`}
                >
                  {bus.route ? 'On route' : 'Idle'}
                </span>
              </div>
              <div className="grid gap-2 text-sm md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Route</p>
                  <p className="mt-1 text-base text-slate-900">{bus.route?.name || 'Unassigned'}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Driver</p>
                  <p className="mt-1 text-base text-slate-900">{bus.driver?.name || bus.driver?.username || 'Unassigned'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-4 py-1 text-slate-600 transition hover:bg-slate-50"
                  onClick={() => openEdit(bus)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-full border border-rose-200 px-4 py-1 text-rose-500 transition hover:bg-rose-50"
                  onClick={() => askDelete(bus)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>

      <Drawer
        isOpen={drawerOpen}
        title={editingBus ? 'Edit bus' : 'Add a new bus'}
        subtitle="Attach routes and drivers in one step"
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="rounded-full px-4 py-2 text-sm text-slate-500" onClick={() => setDrawerOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="bus-form" className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white">
              {editingBus ? 'Save changes' : 'Create bus'}
            </button>
          </div>
        }
      >
        <form id="bus-form" className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-600">
            Bus name
            <input
              name="name"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm font-semibold text-slate-600">
            Number plate
            <input
              name="numberPlate"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 uppercase"
              value={form.numberPlate}
              onChange={(e) => setForm((prev) => ({ ...prev, numberPlate: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm font-semibold text-slate-600">
            Capacity
            <input
              name="capacity"
              type="number"
              min="1"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
              value={form.capacity}
              onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm font-semibold text-slate-600">
            Route
            <select
              name="route"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
              value={form.route}
              onChange={(e) => setForm((prev) => ({ ...prev, route: e.target.value }))}
            >
              <option value="">Unassigned</option>
              {routes.map((route) => (
                <option key={route._id} value={route._id}>
                  {route.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-600">
            Driver
            <select
              name="driver"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
              value={form.driver}
              onChange={(e) => setForm((prev) => ({ ...prev, driver: e.target.value }))}
            >
              <option value="">Unassigned</option>
              {drivers.map((driver) => (
                <option key={driver._id} value={driver._id}>
                  {driver.name || driver.username}
                </option>
              ))}
            </select>
          </label>
        </form>
      </Drawer>

      <ConfirmDialog
        open={confirmState.open}
        title="Delete bus"
        message={`This will remove ${confirmState.target?.name} (${confirmState.target?.numberPlate}).`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmState({ open: false, target: null })}
      />
    </main>
  );
};

export default ManageBuses;
