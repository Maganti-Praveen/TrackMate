import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';
import { Eye, EyeOff, Loader2, UserPlus, LogIn, CheckCircle, X, KeyRound } from 'lucide-react';

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResult, setForgotResult] = useState(null); // { type: 'success'|'error', message }
  const { login, user } = useAuth();

  const targetPath = useMemo(() => {
    if (!user) return null;
    // Redirect to profile if first login to change password
    if (user.firstLogin) return '/profile';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'driver') return '/driver';
    if (user.role === 'student') return '/student';
    return '/login';
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Register new student — no password needed, auto-set to roll number
        await api.post('/auth/register', {
          username,
          name,
          email
        });
        // Show success popup, switch to login mode
        setRegistrationSuccess(true);
        setName('');
        setEmail('');
        // Keep username so user can log in easily
        setPassword('');
      } else {
        await login({ username, password });
      }
    } catch (err) {
      console.error('Auth error:', err);
      const errorMsg = err.response?.data?.message
        || err.response?.data?.error
        || err.message
        || (isSignUp ? 'Registration failed' : 'Login failed');
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setRegistrationSuccess(false);
  };

  const openForgotPassword = () => {
    setShowForgotPassword(true);
    setForgotIdentifier('');
    setForgotResult(null);
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotIdentifier('');
    setForgotResult(null);
    setForgotLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) return;
    setForgotLoading(true);
    setForgotResult(null);

    try {
      const res = await api.post('/auth/forgot-password', { identifier: forgotIdentifier.trim() });
      setForgotResult({ type: 'success', message: res.data.message || 'Check your email for the password.' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Try again.';
      setForgotResult({ type: 'error', message: msg });
    } finally {
      setForgotLoading(false);
    }
  };

  if (targetPath) {
    return <Navigate to={targetPath} replace />;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-4 pt-16 pb-8 safe-bottom">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-wide">TRACKMATE</h1>
          <p className="text-slate-400 text-sm">Real-time college bus tracking</p>
        </div>

        {/* Login/Signup Card */}
        <div className="card-elevated p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-1">
            {isSignUp ? 'Create Account' : 'Welcome back'}
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            {isSignUp ? 'Register to start tracking your bus' : 'Sign in to continue tracking'}
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Registration Success Popup */}
            {registrationSuccess && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 animate-fade-in">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-emerald-400 font-semibold mb-1">Account Created!</h3>
                    <p className="text-sm text-slate-300">
                      Check your email for login credentials.
                    </p>
                    <button
                      type="button"
                      onClick={() => { setRegistrationSuccess(false); setIsSignUp(false); }}
                      className="mt-3 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition"
                    >
                      Go to Sign In &rarr;
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Name (signup only) */}
            {isSignUp && !registrationSuccess && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  className="w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  disabled={isLoading}
                />
              </div>
            )}
            
            {/* Username / Roll Number */}
            {!registrationSuccess && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {isSignUp ? 'Roll Number' : 'Username'} {isSignUp && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="text"
                  placeholder={isSignUp ? 'Enter your roll number' : 'Enter your username'}
                  className="w-full"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Email (signup only) */}
            {isSignUp && !registrationSuccess && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  className="w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
                <p className="text-xs text-slate-400 mt-1">You'll receive a welcome email with your login details</p>
              </div>
            )}

            {/* Password (login only) */}
            {!isSignUp && !registrationSuccess && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="w-full pr-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition float-right"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 animate-fade-in">
                {error}
              </div>
            )}

            {/* Submit */}
            {!registrationSuccess && (
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3.5 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isSignUp ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : (
                  <>
                    {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </>
                )}
              </button>
            )}
          </form>

          {/* Toggle Sign up / Sign in */}
          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-slate-400 text-sm">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button
                type="button"
                onClick={toggleMode}
                className="ml-2 text-indigo-400 hover:text-indigo-300 font-medium transition"
              >
                {isSignUp ? 'Sign In' : 'Create Account'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-6">
          {isSignUp
            ? 'Student accounts only. Admin/Driver accounts are created by administrators.'
            : 'Contact your administrator if you need help'}
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={closeForgotPassword}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm card-elevated p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={closeForgotPassword}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Forgot Password</h3>
                <p className="text-xs text-slate-400">We&apos;ll reset and email your credentials</p>
              </div>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Roll Number or Email
                </label>
                <input
                  type="text"
                  placeholder="Enter your roll number or email"
                  className="w-full"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  required
                  autoFocus
                  disabled={forgotLoading}
                />
              </div>

              {/* Result message */}
              {forgotResult && (
                <div
                  className={`rounded-xl px-4 py-3 text-sm animate-fade-in ${
                    forgotResult.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  }`}
                >
                  {forgotResult.message}
                </div>
              )}

              {/* Submit / Close */}
              {forgotResult?.type === 'success' ? (
                <button
                  type="button"
                  onClick={closeForgotPassword}
                  className="w-full rounded-xl bg-slate-700 py-3 text-white font-semibold hover:bg-slate-600 transition active:scale-[0.98]"
                >
                  Back to Login
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={forgotLoading || !forgotIdentifier.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Login;

