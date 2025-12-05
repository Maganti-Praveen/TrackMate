import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../utils/api';
import GlassCard from '../components/GlassCard';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';

const AssignStudents = () => {
  const [buses, setBuses] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [formMode, setFormMode] = useState('existing');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [quickStudent, setQuickStudent] = useState({ rollNumber: '', name: '' });
  const [formBusId, setFormBusId] = useState('');
  const [formStopId, setFormStopId] = useState('');
  const [formStops, setFormStops] = useState([]);
  const [filterBus, setFilterBus] = useState('all');
  const [filterQuery, setFilterQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerForm, setDrawerForm] = useState({ busId: '', stopId: '' });
  const [drawerStops, setDrawerStops] = useState([]);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, target: null });

  const extractId = (entity) => {
    if (!entity) return '';
    if (typeof entity === 'string') return entity;
    if (typeof entity === 'object') {
      return entity._id || entity.id || '';
    }
    return '';
  };

  const loadBuses = async () => {
    try {
      const res = await api.get('/buses');
      setBuses(res.data);
      if (!formBusId && res.data[0]) {
        setFormBusId(res.data[0]._id);
        hydrateStopsForBus(res.data[0]._id, setFormStops, res.data);
      }
    } catch (error) {
      toast.error('Unable to load buses');
    }
  };

  const loadStudents = async () => {
    try {
      const res = await api.get('/admin/students');
      setStudents(res.data);
      if (!selectedStudentId && res.data[0]) {
        setSelectedStudentId(res.data[0]._id);
      }
    } catch (error) {
      toast.error('Unable to load students');
    }
  };

  const loadAssignments = async () => {
    try {
      const res = await api.get('/admin/assignments');
      setAssignments(res.data);
    } catch (error) {
      toast.error('Unable to load assignments');
    }
  };

  useEffect(() => {
    loadBuses();
    loadStudents();
    loadAssignments();
  }, []);

  const hydrateStopsForBus = async (busId, setter, source = buses) => {
    const bus = (source || buses).find((item) => item._id === busId) || {};
    const routeId = bus.route?._id || bus.route;
    if (!routeId) {
      setter([]);
      return;
    }
    try {
      const res = await api.get(`/stops/${routeId}`);
      setter(res.data);
    } catch (error) {
      setter([]);
    }
  };

  const handleBusChange = (busId) => {
    setFormBusId(busId);
    setFormStopId('');
    hydrateStopsForBus(busId, setFormStops);
  };

  const filteredStudents = useMemo(() => {
    const needle = studentSearch.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((student) =>
      [student.username, student.name, student.phone].some((value) => value?.toLowerCase().includes(needle))
    );
  }, [students, studentSearch]);

  const selectedBus = useMemo(() => buses.find((bus) => bus._id === formBusId), [buses, formBusId]);
  const routeMissing = !selectedBus?.route;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formBusId || !formStopId) {
      toast.warn('Select a bus and stop');
      return;
    }

    const payload = { busId: formBusId, stopId: formStopId };
    if (formMode === 'existing') {
      if (!selectedStudentId) {
        toast.warn('Pick a student');
        return;
      }
      payload.studentId = selectedStudentId;
    } else {
      if (!quickStudent.rollNumber.trim()) {
        toast.warn('Roll number required');
        return;
      }
      payload.rollNumber = quickStudent.rollNumber.trim();
      payload.name = quickStudent.name.trim();
    }

    try {
      await api.post('/admin/assignments', payload);
      toast.success('Student assigned');
      if (formMode === 'quick') {
        setQuickStudent({ rollNumber: '', name: '' });
        loadStudents();
      }
      loadAssignments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to assign student');
    }
  };

  const filteredAssignments = useMemo(() => {
    const needle = filterQuery.trim().toLowerCase();
    return assignments.filter((assignment) => {
      const matchesBus = filterBus === 'all' ? true : extractId(assignment.bus) === filterBus;
      const matchesQuery = needle
        ? [assignment.student?.username, assignment.student?.name, assignment.bus?.name].some((value) =>
            value?.toLowerCase().includes(needle)
          )
        : true;
      return matchesBus && matchesQuery;
    });
  }, [assignments, filterBus, filterQuery]);

  const openEditDrawer = async (assignment) => {
    setEditingAssignment(assignment);
    const busId = extractId(assignment.bus);
    const stopId = extractId(assignment.stop);
    setDrawerForm({ busId, stopId });
    setDrawerOpen(true);
    await hydrateStopsForBus(busId, setDrawerStops);
  };

  const handleDrawerSubmit = async (event) => {
    event.preventDefault();
    if (!editingAssignment) return;
    if (!drawerForm.busId || !drawerForm.stopId) {
      toast.warn('Select both a bus and stop');
      return;
    }
    try {
      await api.put(`/admin/assignments/${editingAssignment._id}`, {
        busId: drawerForm.busId,
        stopId: drawerForm.stopId
      });
      toast.success('Assignment updated');
      setDrawerOpen(false);
      setEditingAssignment(null);
      loadAssignments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update assignment');
    }
  };

  const askDelete = (assignment) => setConfirmState({ open: true, target: assignment });

  const confirmDelete = async () => {
    if (!confirmState.target) return;
    try {
      await api.delete(`/admin/assignments/${confirmState.target._id}`);
      toast.success('Assignment removed');
      setConfirmState({ open: false, target: null });
      loadAssignments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete assignment');
    }
  };

  const assignmentsPerBus = buses.reduce((acc, bus) => {
    const count = assignments.filter((assignment) => extractId(assignment.bus) === bus._id).length;
    acc[bus._id] = count;
    return acc;
  }, {});

  const unassignedStudents = Math.max(students.length - assignments.length, 0);

  return (
    <main className="relative isolate min-h-screen px-6 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_0%,rgba(59,130,246,0.3),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.25),transparent_45%)]" />
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Students & Routes</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Assignment cockpit</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Switch buses, drop students into exact stops, and reroute in seconds. Every action updates the live ETA
              boards and notifications.
            </p>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <GlassCard>
            <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Assigned</p>
            <p className="mt-2 text-4xl font-semibold">{assignments.length}</p>
            <p className="text-sm text-slate-400">students on file</p>
          </GlassCard>
          <GlassCard>
            <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Unassigned</p>
            <p className="mt-2 text-4xl font-semibold">{unassignedStudents}</p>
            <p className="text-sm text-slate-400">need routing</p>
          </GlassCard>
          <GlassCard>
            <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Search assignments</p>
            <input
              type="search"
              className="mt-3 w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-400"
              placeholder="Filter by student or bus"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </GlassCard>
        </div>

        <section className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <GlassCard>
            <div className="flex gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
              <button
                type="button"
                className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold ${
                  formMode === 'existing' ? 'bg-white text-slate-900' : 'border border-white/10 text-white'
                }`}
                onClick={() => setFormMode('existing')}
              >
                Existing student
              </button>
              <button
                type="button"
                className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold ${
                  formMode === 'quick' ? 'bg-white text-slate-900' : 'border border-white/10 text-white'
                }`}
                onClick={() => setFormMode('quick')}
              >
                Quick add
              </button>
            </div>
            <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
              {formMode === 'existing' ? (
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Student</label>
                  <input
                    type="search"
                    placeholder="Search roster"
                    className="mt-2 w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-400"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                  <select
                    className="mt-2 w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    required
                  >
                    <option value="">Select student</option>
                    {filteredStudents.map((student) => (
                      <option key={student._id} value={student._id}>
                        {student.name || student.username} · {student.username}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    placeholder="Roll number"
                    className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-400"
                    value={quickStudent.rollNumber}
                    onChange={(e) => setQuickStudent((prev) => ({ ...prev, rollNumber: e.target.value }))}
                    required
                  />
                  <input
                    placeholder="Student name"
                    className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-400"
                    value={quickStudent.name}
                    onChange={(e) => setQuickStudent((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              )}
              <select
                className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white"
                value={formBusId}
                onChange={(e) => handleBusChange(e.target.value)}
                required
              >
                <option value="">Select bus</option>
                {buses.map((bus) => (
                  <option key={bus._id} value={bus._id}>
                    {bus.name} ({assignmentsPerBus[bus._id] || 0})
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white"
                value={formStopId}
                onChange={(e) => setFormStopId(e.target.value)}
                required
                disabled={!formStops.length}
              >
                <option value="">Select stop</option>
                {formStops.map((stop) => (
                  <option key={stop._id} value={stop._id}>
                    {stop.sequence}. {stop.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/30"
              >
                Assign student
              </button>
              {routeMissing && (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  The selected bus has no route. Edit the bus to attach one before assigning stops.
                </p>
              )}
            </form>
          </GlassCard>

          <GlassCard>
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white"
                value={filterBus}
                onChange={(e) => setFilterBus(e.target.value)}
              >
                <option value="all">All buses</option>
                {buses.map((bus) => (
                  <option key={bus._id} value={bus._id}>
                    {bus.name}
                  </option>
                ))}
              </select>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Assignments</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm text-white/90">
                <thead className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  <tr>
                    <th className="py-2">Student</th>
                    <th>Bus</th>
                    <th>Stop</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map((assignment) => (
                    <tr key={assignment._id} className="border-t border-white/10">
                      <td className="py-3">
                        <p className="font-semibold">{assignment.student?.name}</p>
                        <p className="text-xs text-slate-400">{assignment.student?.username}</p>
                      </td>
                      <td>
                        <p>{assignment.bus?.name || '—'}</p>
                        <p className="text-xs text-slate-400">
                          {assignment.bus?.driver?.name || assignment.bus?.driver?.username || 'No driver'}
                        </p>
                      </td>
                      <td>
                        {assignment.stop ? `${assignment.stop.sequence}. ${assignment.stop.name}` : '—'}
                      </td>
                      <td>
                        <div className="flex gap-2 text-xs">
                          <button className="text-brand" onClick={() => openEditDrawer(assignment)}>
                            Edit
                          </button>
                          <button className="text-rose-300" onClick={() => askDelete(assignment)}>
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredAssignments.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No assignments yet.</p>}
            </div>
          </GlassCard>
        </section>
      </div>

      <Drawer
        isOpen={drawerOpen}
        title="Edit assignment"
        subtitle="Shift students between buses and stops"
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="rounded-full px-4 py-2 text-sm text-slate-500" onClick={() => setDrawerOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="assignment-form" className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white">
              Save changes
            </button>
          </div>
        }
      >
        <form id="assignment-form" className="space-y-4" onSubmit={handleDrawerSubmit}>
          <label className="block text-sm font-semibold text-slate-600">
            Bus
            <select
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
              value={drawerForm.busId}
              onChange={(e) => {
                const nextBusId = e.target.value;
                setDrawerForm((prev) => ({ ...prev, busId: nextBusId, stopId: '' }));
                hydrateStopsForBus(nextBusId, setDrawerStops);
              }}
              required
            >
              <option value="">Select bus</option>
              {buses.map((bus) => (
                <option key={bus._id} value={bus._id}>
                  {bus.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-600">
            Stop
            <select
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
              value={drawerForm.stopId}
              onChange={(e) => setDrawerForm((prev) => ({ ...prev, stopId: e.target.value }))}
              required
            >
              <option value="">Select stop</option>
              {drawerStops.map((stop) => (
                <option key={stop._id} value={stop._id}>
                  {stop.sequence}. {stop.name}
                </option>
              ))}
            </select>
          </label>
        </form>
      </Drawer>

      <ConfirmDialog
        open={confirmState.open}
        title="Remove assignment"
        message={`Unassign ${confirmState.target?.student?.name || confirmState.target?.student?.username}?`}
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmState({ open: false, target: null })}
      />
    </main>
  );
};

export default AssignStudents;

