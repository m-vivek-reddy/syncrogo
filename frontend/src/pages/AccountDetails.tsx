import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { getCurrentUser } from '../api/currentUser';
import { useAppStore } from '../store/useAppStore';

interface ProfileData {
  id: number;
  name: string;
  email: string;
  phone?: string;
  is_verified: boolean;
  rating?: number;
  role?: string;
  profile_photo_url?: string;
}

export default function AccountDetails() {
  const navigate = useNavigate();
  const { user, login } = useAppStore();
  const [profile, setProfile] = useState<ProfileData>({
    id: 0,
    name: '',
    email: '',
    phone: '',
    is_verified: false,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("syncrogo_token") || localStorage.getItem("token");
        if (!token) return;

        const currentProfile = await getCurrentUser<ProfileData>(token);
        setProfile(currentProfile);
        if (currentProfile.name || currentProfile.email) {
        login({
          id: String(currentProfile.id),
          name: currentProfile.name || currentProfile.email,
          email: currentProfile.email,
          rating: currentProfile.rating ?? user?.rating ?? 0,
          role: currentProfile.role || "customer",
          profile_photo_url: currentProfile.profile_photo_url,
        });
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Unable to load account details.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const response = await apiClient.put('/api/v1/users/me', {
        name: profile.name,
        phone: profile.phone,
      });

      setProfile(response.data);
      setMessage('Account details updated successfully!');
      login({
        id: String(response.data.id),
        name: response.data.name || response.data.email,
        email: response.data.email,
        rating: response.data.rating ?? user?.rating ?? 0,
        role: response.data.role || "customer",
        profile_photo_url: response.data.profile_photo_url,
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update account details.');
    }
  };

  if (loading) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="loader mb-4" />
          <p className="text-gray-600">Loading account details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button
        className="text-sm text-slate-500 hover:text-slate-700 mb-4"
        onClick={() => navigate('/profile')}
      >
        ← Back to Profile
      </button>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-3xl font-bold text-syncro-dark mb-4">Account Details</h1>
        <p className="text-sm text-slate-500 mb-6">
          Update your name and phone number. Your email address cannot be changed here.
        </p>

        {message && (
          <div className="mb-4 rounded-2xl bg-green-50 border border-green-100 p-4 text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 border border-red-100 p-4 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              name="name"
              value={profile.name || ''}
              onChange={handleChange}
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-syncro-blue focus:outline-none focus:ring-2 focus:ring-syncro-blue/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              name="email"
              value={profile.email || ''}
              disabled
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 shadow-sm cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="text"
              name="phone"
              value={profile.phone || ''}
              onChange={handleChange}
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-syncro-blue focus:outline-none focus:ring-2 focus:ring-syncro-blue/20"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-syncro-dark px-5 py-3 text-white text-sm font-semibold hover:bg-slate-800 transition"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
