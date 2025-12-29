import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CircleUser } from 'lucide-react';


const navLinkCls =
  'text-sm font-semibold tracking-wide text-orange-100 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 100);
  };

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
                <Link to="/admin/students" className={navLinkCls}>
                  People
                </Link>
                <Link to="/admin/assignments" className={navLinkCls}>
                  Assignments
                </Link>
              </>
            )}
            {user.role === 'driver' && (
              <Link to="/driver" className={navLinkCls}>
                Driver
              </Link>
            )}
            {user.role === 'student' && (
              <Link to="/student" className={navLinkCls}>
                Student
              </Link>
            )}
            {/* Profile Dropdown */}
            <div
              className="relative ml-4"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                className="flex items-center text-orange-100 transition hover:text-white"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                aria-label="Open user menu"
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
              >
                <CircleUser className="h-8 w-8" aria-hidden="true" />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl border border-white/10 bg-slate-900 py-2 shadow-xl ring-1 ring-black ring-opacity-5 backdrop-blur-xl"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu"
                >
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
                    role="menuitem"
                  >
                    View Profile
                  </Link>
                  <button
                    onClick={logout}
                    className="block w-full px-4 py-2 text-left text-sm text-rose-400 hover:bg-white/10 hover:text-rose-300"
                    role="menuitem"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </nav>
        ) : (
          <span className="text-sm uppercase tracking-[0.4em] text-slate-400">Login</span>
        )}
      </div>
    </header >
  );
};

export default Navbar;
