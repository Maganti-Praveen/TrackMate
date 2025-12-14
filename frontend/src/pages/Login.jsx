import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, user } = useAuth();

  const targetPath = useMemo(() => {
    if (!user) return null;
    if (user.role === 'admin') return '/admin';
    if (user.role === 'driver') return '/driver';
    if (user.role === 'student') return '/student';
    return '/login';
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login({ username, password });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  if (targetPath) {
    return <Navigate to={targetPath} replace />;
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-white shadow-2xl shadow-black/50">
        <h1 className="mb-2 text-2xl font-semibold text-white">TrackMate Login</h1>
        <p className="mb-6 text-sm text-slate-300">Use your role specific credentials.</p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">Username</label>
            <input
              type="text"
              className="w-full rounded-2xl border border-white/10 bg-slate-900/50 px-3 py-2 text-white"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">Password</label>
            <input
              type="password"
              className="w-full rounded-2xl border border-white/10 bg-slate-900/50 px-3 py-2 text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-orange-500/30"
          >
            Sign in
          </button>
        </form>
        <div className="mt-4 text-xs text-slate-300">
          Admin: ad1/ad1 · Driver: dr1/dr1 · Student: RollNo (e.g. 22ME1A0501)
        </div>
      </div>
    </main>
  );
};

export default Login;
