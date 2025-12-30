import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { 
  Bus, Home, Users, Navigation, MapPin, UserCheck, 
  User, LogOut, Sun, Moon, Octagon
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  // Admin navigation items
  const adminLinks = [
    { to: '/admin', icon: Home, label: 'Dashboard' },
    { to: '/admin/buses', icon: Bus, label: 'Buses' },
    { to: '/admin/drivers', icon: UserCheck, label: 'Drivers' },
    { to: '/admin/routes', icon: Navigation, label: 'Routes' },
    { to: '/admin/students', icon: Users, label: 'Students' },
    { to: '/admin/assignments', icon: MapPin, label: 'Assign' },
  ];

  // Bottom nav for mobile (student/driver)
  const getMobileNav = () => {
    if (user?.role === 'student') {
      return [
        { to: '/student', icon: Home, label: 'Track' },
        { to: '/profile', icon: User, label: 'Profile' },
      ];
    }
    if (user?.role === 'driver') {
      return [
        { to: '/driver', icon: Navigation, label: 'Drive' },
        { to: '/profile', icon: User, label: 'Profile' },
      ];
    }
    return [];
  };

  const mobileNav = getMobileNav();

  // Fallback for theme - default to dark
  const darkMode = isDark ?? true;

  return (
    <>
      {/* Top Header */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl ${darkMode ? 'bg-slate-900/90 border-white/10' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to={user ? (user.role === 'admin' ? '/admin' : `/${user.role}`) : '/login'} className="flex items-center gap-2 flex-shrink-0">
            <span className="text-lg font-semibold tracking-[0.3em] text-white uppercase">
              TrackMate
            </span>
          </Link>

          {/* Desktop Admin Nav - Center */}
          {user?.role === 'admin' && (
            <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {adminLinks.map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                    isActive(to) 
                      ? 'bg-indigo-500/20 text-indigo-400' 
                      : darkMode 
                        ? 'text-slate-400 hover:text-white hover:bg-white/5' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              ))}
            </nav>
          )}

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition ${darkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user && (
              <>
                {/* User Info & Logout - Always visible */}
                <Link
                  to="/profile"
                  className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg transition ${darkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium hidden md:inline">{user.name || user.username}</span>
                </Link>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-500/10 transition"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            )}

            {!user && (
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation (Student/Driver only) */}
      {user && (user.role === 'student' || user.role === 'driver') && mobileNav.length > 0 && (
        <nav className={`fixed bottom-0 left-0 right-0 z-40 border-t md:hidden safe-bottom ${darkMode ? 'bg-slate-900/90 backdrop-blur-xl border-white/10' : 'bg-white/90 backdrop-blur-xl border-slate-200'}`}>
          <div className="flex items-center justify-around py-2">
            {mobileNav.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition ${
                  isActive(to)
                    ? 'text-indigo-600'
                    : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive(to) ? 'scale-110' : ''} transition`} />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            ))}
            <button
              onClick={logout}
              className="flex flex-col items-center gap-1 px-6 py-2 rounded-xl text-red-500 hover:text-red-400 transition"
            >
              <LogOut className="w-6 h-6" />
              <span className="text-xs font-medium">Logout</span>
            </button>
          </div>
        </nav>
      )}
    </>
  );
};

export default Navbar;
