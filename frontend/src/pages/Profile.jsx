import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const Profile = () => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        role: '',
        name: '',
        phone: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || '',
                role: user.role || '',
                name: user.name || '',
                phone: user.phone || '',
                password: '' // Keep empty for security
            });
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            name: formData.name,
            phone: formData.phone
        };
        if (formData.password) payload.password = formData.password;

        try {
            await api.put('/auth/profile', payload); // Note: Route path verified in backend
            toast.success('Profile updated successfully!');
            // Ideally refresh auth context here or force logout if password changed, 
            // but for now simple success feedback is sufficient.
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-indigo-500/30">
            <main className="mx-auto max-w-lg px-6 py-12">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
                    <header className="mb-8 text-center">
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">My Profile</h1>
                        <p className="text-slate-400">Manage your account settings</p>
                    </header>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Read-only Fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    disabled
                                    className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-slate-400 focus:outline-none cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Role
                                </label>
                                <input
                                    type="text"
                                    value={formData.role.toUpperCase()}
                                    disabled
                                    className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-slate-400 focus:outline-none cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* Editable Fields */}
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-indigo-400">
                                Full Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter your name"
                                className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-600 transition focus:border-indigo-500 focus:bg-indigo-500/5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-indigo-400">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="Enter phone number"
                                className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-600 transition focus:border-indigo-500 focus:bg-indigo-500/5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-indigo-400">
                                New Password
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Leave blank to keep current"
                                className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-slate-600 transition focus:border-indigo-500 focus:bg-indigo-500/5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <p className="mt-2 text-xs text-slate-500">Only fill this if you want to change your password.</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-8 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-4 text-base font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:scale-[1.02] hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default Profile;
