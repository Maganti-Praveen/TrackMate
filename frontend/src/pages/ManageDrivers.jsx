import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../utils/api';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';

const blankForm = { username: '', password: '', name: '', phone: '' };

const ManageDrivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(blankForm);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, target: null });

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/drivers');
      setDrivers(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load drivers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const openCreate = () => {
    setEditingDriver(null);
    setForm(blankForm);
    setDrawerOpen(true);
  };

  const openEdit = (driver) => {
    setEditingDriver(driver);
    setForm({ username: driver.username, password: '', name: driver.name || '', phone: driver.phone || '' });
    setDrawerOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      username: form.username,
      name: form.name,
      phone: form.phone
    };
    if (!editingDriver || form.password.trim()) {
      payload.password = form.password.trim() || form.username;
    }

    try {
      if (editingDriver) {
        await api.put(`/admin/drivers/${editingDriver._id}`, payload);
        toast.success('Driver updated');
      } else {
        await api.post('/admin/drivers', payload);
        toast.success('Driver created');
      }
      setDrawerOpen(false);
      setForm(blankForm);
      setEditingDriver(null);
      loadDrivers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save driver');
    }
  };

  const askDelete = (driver) => setConfirmState({ open: true, target: driver });

  const confirmDelete = async () => {
    if (!confirmState.target) return;
    try {
      await api.delete(`/admin/drivers/${confirmState.target._id}`);
      toast.success('Driver removed');
      setConfirmState({ open: false, target: null });
      loadDrivers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete driver');
    }
  };

  const filteredDrivers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return drivers;
    return drivers.filter((driver) =>
      [driver.username, driver.name, driver.phone].some((value) => value?.toLowerCase().includes(needle))
    );
  }, [drivers, search]);

  const assignedDrivers = drivers.filter((driver) => driver.assignedBusId).length;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Admin Suite</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Driver Roster</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-500">
              Invite, edit or retire drivers with a glass-panel control center. Every change syncs instantly with the live
              tracker.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold uppercase tracking-wide text-slate-900 shadow-lg shadow-slate-900/30 transition hover:-translate-y-0.5"
          >
            Add driver
          </button>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.5em] text-slate-500">Total</p>
            <p className="mt-2 text-4xl font-semibold text-slate-800">{drivers.length}</p>
            <p className="text-sm text-slate-500">registered drivers</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.5em] text-slate-500">Assigned</p>
            <p className="mt-2 text-4xl font-semibold text-slate-800">{assignedDrivers}</p>
            <p className="text-sm text-slate-500">linked to a bus</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.5em] text-slate-500">Search</p>
            <input
              type="search"
              placeholder="Search by name or username"
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <section className="space-y-4">
          {loading && <p className="text-sm text-slate-300">Loading roster...</p>}
          {!loading && filteredDrivers.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center text-slate-300">
              <p className="text-lg font-semibold">No drivers match your filters</p>
              <p className="text-sm text-slate-400">Try clearing the search field or create a new profile.</p>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {filteredDrivers.map((driver) => (
              <div key={driver._id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.4em] text-slate-500">{driver.username}</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-800">{driver.name || 'Unnamed driver'}</h3>
                    <p className="text-sm text-slate-500">{driver.phone || 'No phone on file'}</p>
                  </div>
                  <span
                    className={`badge ${driver.assignedBusId ? 'bg-success-subtle text-success-emphasis' : 'bg-warning-subtle text-warning-emphasis'
                      }`}
                  >
                    {driver.assignedBusId ? 'Assigned' : 'Unassigned'}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-4 py-1 text-slate-600 transition hover:bg-slate-50"
                    onClick={() => openEdit(driver)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-rose-200 px-4 py-1 text-rose-500 transition hover:bg-rose-50"
                    onClick={() => askDelete(driver)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Drawer
        isOpen={drawerOpen}
        title={editingDriver ? 'Edit driver' : 'Create driver'}
        subtitle="Credentials sync instantly with the mobile app"
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="rounded-full px-4 py-2 text-sm text-slate-500" onClick={() => setDrawerOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="driver-form" className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white">
              {editingDriver ? 'Save changes' : 'Create driver'}
            </button>
          </div>
        }
      >
        <form id="driver-form" className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-600">
            Username
            <input
              name="username"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm font-semibold text-slate-600">
            Password
            <input
              name="password"
              type="text"
              placeholder={editingDriver ? 'Leave blank to keep current password' : ''}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              required={!editingDriver}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-600">
            Full name
            <input
              name="name"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-600">
            Phone
            <input
              name="phone"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </label>
        </form>
      </Drawer>

      <ConfirmDialog
        open={confirmState.open}
        title="Remove driver"
        message={`This will disconnect ${confirmState.target?.name || confirmState.target?.username} from every bus.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmState({ open: false, target: null })}
      />
    </main>
  );
};

export default ManageDrivers;
