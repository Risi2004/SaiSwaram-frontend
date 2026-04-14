import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import logo from '../assets/logo.png';
import {
  clearAllOfflineUserData,
  deleteBhajan,
  deleteSchedule,
  getAnalyticsSnapshot,
  getBhajans,
  getSchedules,
  subscribeSyncStatus,
  syncNow,
  updateSchedule,
} from '../data/offlineRepository';

const COLORS = ['#C85131', '#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'];
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function Dashboard() {
  const navigate = useNavigate();
  const [bhajans, setBhajans] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [scheduleDrafts, setScheduleDrafts] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [syncStatus, setSyncStatus] = useState({
    online: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    lastError: null,
  });

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [bhajansData, schedulesData] = await Promise.all([
          getBhajans({ refresh: true }),
          getSchedules({ refresh: true }),
        ]);
        setBhajans(bhajansData);
        setSchedules(schedulesData);

        const token = localStorage.getItem('token');
        if (navigator.onLine && token) {
          const analyticsRes = await fetch(`${API_BASE}/api/analytics`, {
            headers: { 'x-auth-token': token },
          });
          if (analyticsRes.ok) {
            setAnalytics(await analyticsRes.json());
          } else {
            setAnalytics(await getAnalyticsSnapshot());
          }
        } else {
          setAnalytics(await getAnalyticsSnapshot());
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const unsubscribe = subscribeSyncStatus((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    const refreshAfterSync = async () => {
      if (!syncStatus.isSyncing && syncStatus.online) {
        const [bhajansData, schedulesData] = await Promise.all([
          getBhajans(),
          getSchedules(),
        ]);
        setBhajans(bhajansData);
        setSchedules(schedulesData);
      }
    };

    refreshAfterSync();
  }, [syncStatus.isSyncing, syncStatus.online]);

  const handleLogout = async () => {
    localStorage.removeItem('token');
    try {
      await clearAllOfflineUserData();
    } catch {
      // Still navigate away if IndexedDB is unavailable
    }
    navigate('/login');
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this bhajan? This cannot be undone.")) {
      try {
        await deleteBhajan(id);
        setBhajans(prev => prev.filter(b => b._id !== id));
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleSyncNow = async () => {
    try {
      await syncNow();
      const [bhajansData, schedulesData, localAnalytics] = await Promise.all([
        getBhajans({ refresh: true }),
        getSchedules({ refresh: true }),
        getAnalyticsSnapshot(),
      ]);
      setBhajans(bhajansData);
      setSchedules(schedulesData);
      setAnalytics(localAnalytics);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleScheduleDraftChange = (id, date) => {
    setScheduleDrafts((prev) => ({ ...prev, [id]: date }));
  };

  const handleScheduleUpdate = async (id) => {
    const scheduledDate = scheduleDrafts[id];
    if (!scheduledDate) return;
    try {
      await updateSchedule(id, { scheduledDate });
      const refreshed = await getSchedules();
      setSchedules(refreshed);
      setAnalytics(await getAnalyticsSnapshot());
    } catch (err) {
      setError(err.message);
    }
  };

  const handleScheduleDelete = async (id) => {
    if (!window.confirm('Delete this scheduled reminder?')) return;
    try {
      await deleteSchedule(id);
      setSchedules((prev) => prev.filter((item) => item._id !== id));
      setAnalytics(await getAnalyticsSnapshot());
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredBhajans = bhajans.filter(bhajan => 
    bhajan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bhajan.deity.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="font-sans text-gray-800 bg-gray-50 min-h-screen selection:bg-primary selection:text-white">
      {/* Dashboard Nav */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 bg-white shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src={logo} alt="SaiSwaram" className="w-8 h-8 object-contain" />
          <span className="text-xl font-bold text-gray-900 tracking-tight">SaiSwaram <span className="text-sm text-gray-500 font-normal">Dashboard</span></span>
        </div>
        <div className="flex gap-4 items-center">
          <button 
            onClick={handleLogout}
            className="font-medium text-gray-600 hover:text-primary transition-colors"
          >
            Log out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        
        {analytics && (
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Stat Card */}
            <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col justify-center items-center text-center hover:border-primary/20 transition-colors">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4 text-primary shadow-inner">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Total Scheduled</h3>
              <p className="text-5xl font-extrabold text-gray-900">{analytics.totalScheduled}</p>
            </div>

            {/* Pie Chart Card */}
            <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:border-primary/20 transition-colors">
              <h3 className="text-gray-800 font-bold mb-4 text-center">Top Scheduled Deities</h3>
              {analytics.deityDistribution.length > 0 ? (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.deityDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {analytics.deityDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Schedule bhajans to see data</div>
              )}
            </div>

            {/* Bar Chart Card */}
            <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:border-primary/20 transition-colors">
              <h3 className="text-gray-800 font-bold mb-4 text-center">Monthly Activity</h3>
              {analytics.monthlyTrends.length > 0 ? (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{fontSize: 12, fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: '#fff7ed'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="sessions" fill="#C85131" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Schedule bhajans to see data</div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
          <h2 className="text-3xl font-bold text-gray-800">My Bhajans</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncNow}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg font-bold transition-all"
            >
              {syncStatus.isSyncing ? 'Syncing...' : 'Sync now'}
            </button>
            <Link to="/add-bhajan" className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg font-bold shadow-md transition-all flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
              Add Bhajan
            </Link>
          </div>
        </div>

        <div className={`mb-6 p-4 rounded-xl border ${syncStatus.online ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'}`}>
          <p className={`font-semibold ${syncStatus.online ? 'text-green-700' : 'text-yellow-700'}`}>
            {syncStatus.online ? 'Online mode' : 'Offline mode'}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Pending sync actions: {syncStatus.pendingCount}
            {syncStatus.lastSyncAt ? ` • Last sync: ${new Date(syncStatus.lastSyncAt).toLocaleString()}` : ''}
          </p>
          {syncStatus.lastError && (
            <p className="text-sm text-red-600 mt-1">Sync issue: {syncStatus.lastError}</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-medium">
            {error}
          </div>
        )}

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${activeTab === 'all' ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:border-primary/30'}`}
          >
            All Bhajans
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${activeTab === 'scheduled' ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:border-primary/30'}`}
          >
            Scheduled Bhajans
          </button>
        </div>

        {activeTab === 'all' && (
          <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
            {/* Search Bar */}
            <div className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl mb-6 flex items-center px-4 text-gray-400 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input
                type="text"
                placeholder="Search by title or deity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-gray-700"
              />
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12 text-gray-400">Loading your bhajans...</div>
              ) : bhajans.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No bhajans added yet</h3>
                  <p className="text-gray-500 max-w-sm mx-auto">Get started by adding your first bhajan to keep track of its lyrics, pitch, and deity.</p>
                </div>
              ) : filteredBhajans.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No results found matching "{searchQuery}".
                </div>
              ) : (
                filteredBhajans.map((bhajan) => (
                  <div
                    key={bhajan._id}
                    onClick={() => navigate(`/bhajan/${bhajan._id}`)}
                    className="flex justify-between items-center p-4 border border-gray-100 rounded-xl hover:border-primary/30 hover:bg-orange-50/30 transition-colors cursor-pointer group"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-lg group-hover:text-primary transition-colors">{bhajan.title}</p>
                      <p className="text-gray-500 text-sm">{bhajan.deity}</p>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-end">
                      {bhajan.pitch && (
                        <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md font-bold text-sm shadow-sm group-hover:bg-primary group-hover:text-white transition-colors mr-2">
                          {bhajan.pitch}
                        </div>
                      )}
                      <div className="flex items-center border-l-2 border-transparent group-hover:border-orange-200 pl-2 transition-all">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/edit-bhajan/${bhajan._id}`); }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit Bhajan"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, bhajan._id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Bhajan"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'scheduled' && (
          <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Scheduled Bhajans</h3>
            {loading ? (
              <p className="text-gray-500">Loading scheduled reminders...</p>
            ) : schedules.length === 0 ? (
              <p className="text-gray-500">No scheduled reminders yet.</p>
            ) : (
              <div className="space-y-4">
                {schedules.map((schedule) => {
                  const bhajanId = schedule.bhajan?._id || schedule.bhajan;
                  const relatedBhajan = bhajans.find((b) => b._id === bhajanId);
                  const title = schedule.bhajan?.title || relatedBhajan?.title || 'Bhajan';
                  const pending = schedule._sync?.pending;
                  return (
                    <div key={schedule._id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-gray-800">{title}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(schedule.scheduledDate).toLocaleDateString()}
                            {pending ? ' • Pending sync' : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <input
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            value={scheduleDrafts[schedule._id] || new Date(schedule.scheduledDate).toISOString().split('T')[0]}
                            onChange={(e) => handleScheduleDraftChange(schedule._id, e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <button
                            onClick={() => handleScheduleUpdate(schedule._id)}
                            className="px-3 py-2 bg-primary text-white rounded-lg font-semibold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => handleScheduleDelete(schedule._id)}
                            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
