import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { 
  User, Phone, Lock, Shield, Save, Eye, EyeOff, 
  CheckCircle, AlertCircle
} from 'lucide-react';
import NotificationToggle from '../components/NotificationToggle';

const Profile = () => {
  const { user } = useAuth();
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
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      await api.put('/auth/profile', payload);
      toast.success('Profile updated successfully!');
      setFormData(prev => ({ ...prev, currentPassword: '', password: '' }));
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

  return (
    <main className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
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
