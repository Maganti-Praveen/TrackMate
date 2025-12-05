import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../utils/api';
import GlassCard from '../components/GlassCard';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';

const blankForm = { username: '', password: '', name: '', phone: '' };

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [confirmState, setConfirmState] = useState({ open: false, target: null });

  const loadStudents = async () => {
    try {
      const [studentsRes, assignmentsRes] = await Promise.all([api.get('/admin/students'), api.get('/admin/assignments')]);
      setStudents(studentsRes.data);
      const assignmentMap = assignmentsRes.data.reduce((acc, assignment) => {
        if (assignment.student?._id) {
          acc[assignment.student._id] = assignment;
        }
        return acc;
      }, {});
      setAssignments(assignmentMap);
    } catch (error) {
      toast.error('Unable to load students');
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const openCreate = () => {
    setEditingStudent(null);
    setForm(blankForm);
    setDrawerOpen(true);
  };

  const openEdit = (student) => {
    setEditingStudent(student);
    setForm({ username: student.username, password: '', name: student.name || '', phone: student.phone || '' });
    setDrawerOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      username: form.username.trim(),
      name: form.name,
      phone: form.phone
    };
    if (!editingStudent || form.password.trim()) {
      payload.password = form.password.trim() || form.username.trim();
    }

    try {
      if (editingStudent) {
        await api.put(`/admin/students/${editingStudent._id}`, payload);
        toast.success('Student updated');
      } else {
        await api.post('/admin/students', payload);
        toast.success('Student created');
      }
      setDrawerOpen(false);
      setEditingStudent(null);
      setForm(blankForm);
      loadStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save student');
    }
  };

  const askDelete = (student) => setConfirmState({ open: true, target: student });

  const confirmDelete = async () => {
    if (!confirmState.target) return;
    try {
      await api.delete(`/admin/students/${confirmState.target._id}`);
      toast.success('Student removed');
      setConfirmState({ open: false, target: null });
      loadStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete student');
    }
  };

  const filteredStudents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((student) =>
      [student.username, student.name, student.phone].some((value) => value?.toLowerCase().includes(needle))
    );
  }, [students, search]);

  const assignedCount = Object.keys(assignments).length;
  const unassigned = Math.max(students.length - assignedCount, 0);

  return (
    <main className="relative isolate min-h-screen px-6 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.3),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.25),transparent_45%)]" />
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">People Hub</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Student directory</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Manage credentials and contact info before attaching riders to buses. Details sync instantly across the app.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold uppercase tracking-wide text-slate-900 shadow-lg shadow-slate-900/30 transition hover:-translate-y-0.5"
          >
            New student
          </button>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <GlassCard>
            <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Students</p>
            <p className="mt-2 text-4xl font-semibold">{students.length}</p>
            <p className="text-sm text-slate-400">accounts created</p>
          </GlassCard>
          <GlassCard>
            <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Assigned</p>
            <p className="mt-2 text-4xl font-semibold">{assignedCount}</p>
            <p className="text-sm text-slate-400">{unassigned} awaiting assignment</p>
          </GlassCard>
          <GlassCard>
            <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Search</p>
            <input
              type="search"
              className="mt-3 w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-400"
              placeholder="Filter by roll or name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </GlassCard>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          {filteredStudents.map((student) => {
            const assignment = assignments[student._id];
            return (
              <GlassCard key={student._id} className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{student.username}</p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">{student.name || 'Unnamed student'}</h3>
                    <p className="text-sm text-slate-300">{student.phone || 'No phone added'}</p>
                  </div>
                  <span
                    className={`badge ${assignment ? 'bg-success-subtle text-success-emphasis' : 'bg-warning-subtle text-warning-emphasis'}`}
                  >
                    {assignment ? 'Assigned' : 'Pending'}
                  </span>
                </div>
                {assignment && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                    <p>Bus: {assignment.bus?.name || '—'}</p>
                    <p>Stop: {assignment.stop ? `${assignment.stop.sequence}. ${assignment.stop.name}` : '—'}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 text-sm">
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-4 py-1 text-white transition hover:bg-white/10"
                    onClick={() => openEdit(student)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-rose-500/50 px-4 py-1 text-rose-300 transition hover:bg-rose-500/10"
                    onClick={() => askDelete(student)}
                    disabled={Boolean(assignment)}
                  >
                    Delete
                  </button>
                </div>
              </GlassCard>
            );
          })}
          {filteredStudents.length === 0 && (
            <GlassCard className="md:col-span-2 text-center text-slate-300">
              <p className="text-lg font-semibold">No students match your filters</p>
              <p className="text-sm text-slate-400">Invite someone new or clear the search field.</p>
            </GlassCard>
          )}
        </section>
      </div>

      <Drawer
        isOpen={drawerOpen}
        title={editingStudent ? 'Edit student' : 'Create student'}
        subtitle="Credentials sync with the mobile app"
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="rounded-full px-4 py-2 text-sm text-slate-500" onClick={() => setDrawerOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="student-form" className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white">
              {editingStudent ? 'Save changes' : 'Create student'}
            </button>
          </div>
        }
      >
        <form id="student-form" className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-600">
            Roll / username
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm font-semibold text-slate-600">
            Password
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
              value={form.password}
              placeholder={editingStudent ? 'Leave blank to keep current password' : ''}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              required={!editingStudent}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-600">
            Name
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-600">
            Phone
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </label>
        </form>
      </Drawer>

      <ConfirmDialog
        open={confirmState.open}
        title="Delete student"
        message={`Remove ${confirmState.target?.name || confirmState.target?.username}? Their assignments will also be cleared.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmState({ open: false, target: null })}
      />
    </main>
  );
};

export default ManageStudents;
