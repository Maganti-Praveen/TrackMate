import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navLinkCls =
  'text-sm font-semibold tracking-wide text-orange-100 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-black/70 via-slate-950/70 to-black/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link
          to={user ? '/admin' : '/login'}
          className="text-2xl font-semibold uppercase tracking-[0.35em] text-white drop-shadow-[0_0_10px_rgba(255,107,44,0.4)]"
        >
          TrackMate
        </Link>
        {user ? (
          <nav className="flex flex-wrap items-center gap-4">
            {user.role === 'admin' && (
              <>
                <Link to="/admin" className={navLinkCls}>
                  Dashboard
                </Link>
                <Link to="/admin/buses" className={navLinkCls}>
                  Buses
                </Link>
                <Link to="/admin/drivers" className={navLinkCls}>
                  Drivers
                </Link>
                <Link to="/admin/routes" className={navLinkCls}>
                  Routes
                </Link>
                <Link to="/admin/stops" className={navLinkCls}>
                  Stops
                </Link>
                <Link to="/admin/students" className={navLinkCls}>
                  People
                </Link>
                <Link to="/admin/assignments" className={navLinkCls}>
                  Assignments
                </Link>
              </>
            )}
            {user.role === 'driver' && (
              <>
                <Link to="/driver" className={navLinkCls}>
                  Driver
                </Link>
                <Link to="/driver-sim" className={navLinkCls}>
                  Simulator
                </Link>
              </>
            )}
            {user.role === 'admin' && (
              <Link to="/driver-sim" className={navLinkCls}>
                Driver Sim
              </Link>
            )}
            {user.role === 'student' && (
              <Link to="/student" className={navLinkCls}>
                Student
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-white/30 px-4 py-1 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
            >
              Logout
            </button>
          </nav>
        ) : (
          <span className="text-sm uppercase tracking-[0.4em] text-slate-400">Login</span>
        )}
      </div>
    </header>
  );
};

export default Navbar;
