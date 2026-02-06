import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  User, Phone, Lock, Shield, Save, Eye, EyeOff,
  Bus, MapPin, AlertCircle
} from 'lucide-react';
import NotificationToggle from '../components/NotificationToggle';

const roleRedirect = {
  admin: '/admin',
  driver: '/driver',
  student: '/student'
};

const Profile = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    role: '',
    name: '',
    phone: '',
    currentPassword: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Bus/Stop selection state (students only)
  const [buses, setBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [selectedStopSeq, setSelectedStopSeq] = useState('');
  const [currentAssignment, setCurrentAssignment] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        role: user.role || '',
        name: user.name || '',
        phone: user.phone || '',
        currentPassword: '',
        password: ''
      });

      // Fetch buses and current assignment for students
      if (user.role === 'student') {
        fetchBusesAndAssignment();
      }
    }
  }, [user]);

  const fetchBusesAndAssignment = async () => {
    try {
      const [busesRes, assignmentRes] = await Promise.all([
        api.get('/students/buses'),
        api.get('/students/assignment')
      ]);

      setBuses(busesRes.data || []);

      if (assignmentRes.data) {
        setCurrentAssignment(assignmentRes.data);
        setSelectedBusId(assignmentRes.data.bus?._id || '');
        setSelectedStopSeq(assignmentRes.data.stop?.seq?.toString() || assignmentRes.data.stop?.sequence?.toString() || '');
      }
    } catch (err) {
      console.error('Failed to fetch buses:', err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBusChange = (e) => {
    setSelectedBusId(e.target.value);
    setSelectedStopSeq(''); // Reset stop when bus changes
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (formData.password && !formData.currentPassword) {
      toast.error('Current password is required to change password');
      setLoading(false);
      return;
    }

    const payload = {
      name: formData.name,
      phone: formData.phone
    };
    if (formData.password) {
      payload.password = formData.password;
      payload.currentPassword = formData.currentPassword;
    }

    try {
      // Update profile
      await api.put('/auth/profile', payload);

      // Update bus assignment for students
      if (formData.role === 'student' && selectedBusId) {
        await api.put('/students/assignment', {
          busId: selectedBusId,
          stopSeq: selectedStopSeq ? parseInt(selectedStopSeq) : null
        });
      }

      toast.success('Profile updated successfully!');
      setFormData(prev => ({ ...prev, currentPassword: '', password: '' }));

      // If this was a first login, update user state and redirect to dashboard
      if (user?.firstLogin) {
        const updatedUser = { ...user, firstLogin: false, name: formData.name, phone: formData.phone };
        setUser(updatedUser);
        localStorage.setItem('tm_user', JSON.stringify(updatedUser));
        toast.success('Welcome to TrackMate! Redirecting to dashboard...', { duration: 2000 });
        setTimeout(() => {
          navigate(roleRedirect[user.role] || '/student', { replace: true });
        }, 1500);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-purple-500/20 text-purple-400',
      driver: 'bg-emerald-500/20 text-emerald-400',
      student: 'bg-indigo-500/20 text-indigo-400'
    };
    return styles[role] || 'bg-slate-500/20 text-slate-400';
  };

  // Get stops for selected bus
  const selectedBus = buses.find(b => b._id === selectedBusId);
  const availableStops = selectedBus?.route?.stops || [];

  return (
    <main className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* First Login Warning */}
        {user?.firstLogin && (
          <div className="card p-5 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20 animate-pulse-slow">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-orange-400 font-semibold mb-1">🔒 Security Alert: Change Your Password</h3>
                <p className="text-sm text-slate-300">
                  You're using your initial password (same as your username). For your security, please change it now.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{formData.name || formData.username}</h1>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${getRoleBadge(formData.role)}`}>
            {formData.role}
          </span>
        </header>

        {/* Account Info Card */}
        <div className="card p-5">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Account Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Username</p>
              <p className="text-white font-medium truncate">@{formData.username}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Role</p>
              <p className="text-white font-medium capitalize">{formData.role}</p>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Personal Info */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Personal Information</h2>

            <div>
              <label className="text-sm text-slate-300 mb-1.5 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-1.5 block">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>
          </div>

          {/* Bus & Stop Selection - Students Only */}
          {formData.role === 'student' && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Bus className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Bus Assignment</h2>
              </div>

              <div>
                <label className="text-sm text-slate-300 mb-1.5 block">Select Bus</label>
                <div className="relative">
                  <Bus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={selectedBusId}
                    onChange={handleBusChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50 appearance-none"
                  >
                    <option value="">Select a bus...</option>
                    {buses.map(bus => (
                      <option key={bus._id} value={bus._id}>
                        {bus.name} ({bus.numberPlate}) {bus.route ? `- ${bus.route.name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {availableStops.length > 0 && (
                <div>
                  <label className="text-sm text-slate-300 mb-1.5 block">Select Your Stop</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={selectedStopSeq}
                      onChange={(e) => setSelectedStopSeq(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50 appearance-none"
                    >
                      <option value="">Select your stop...</option>
                      {availableStops.map(stop => (
                        <option key={stop._id} value={stop.seq}>
                          Stop #{stop.seq}: {stop.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {currentAssignment && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <p className="text-xs text-indigo-300">
                    Current: <strong>{currentAssignment.bus?.name}</strong>
                    {currentAssignment.stop?.name && ` → ${currentAssignment.stop.name}`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Change Password */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Change Password</h2>
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-1.5 block">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="Required to change password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-1.5 block">New Password</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">Only fill this if you want to change your password.</p>
            </div>
          </div>

          {/* Notifications - Only for students */}
          {formData.role === 'student' && (
            <div className="card p-5">
              <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Push Notifications</h2>
              <NotificationToggle />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
};

export default Profile;

