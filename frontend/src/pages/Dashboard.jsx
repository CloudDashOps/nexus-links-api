import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Search, Link2, MousePointerClick, QrCode, X,
  Copy, ExternalLink, Trash2, Calendar, Clock, Globe, TrendingUp,
  LayoutDashboard, Link as LinkIcon, Settings, HelpCircle,
  LogOut, User, Menu, Loader2, Eye, AlertCircle,
  CheckCircle2, Zap, Target, Activity, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';

const BASE_URL = 'http://127.0.0.1:8000';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');

  // Create link form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ target_url: '', custom_slug: '', title: '' });
  const [formErrors, setFormErrors] = useState({});
  const [creating, setCreating] = useState(false);

  // Drawer state
  const [selectedLink, setSelectedLink] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // QR state
  const [qrLink, setQrLink] = useState(null);
  const [qrImage, setQrImage] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState(null);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/links/');
      setLinks(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load links. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // ===== Stats =====
  const stats = useMemo(() => {
    const totalLinks = links.length;
    const totalClicks = links.reduce((sum, link) => sum + (link.clicks || 0), 0);
    const activeLinks = links.filter((link) => {
      if (!link.expires_at) return true;
      return new Date(link.expires_at) > new Date();
    }).length;
    const expiredLinks = links.filter((link) => {
      if (!link.expires_at) return false;
      return new Date(link.expires_at) <= new Date();
    }).length;
    const avgClicks = totalLinks > 0 ? Math.round(totalClicks / totalLinks) : 0;
    return { totalLinks, totalClicks, activeLinks, expiredLinks, avgClicks };
  }, [links]);

  // ===== Filtered links =====
  const filteredLinks = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return links.filter((link) => {
      return (
        link.target_url?.toLowerCase().includes(query) ||
        link.short_code?.toLowerCase().includes(query) ||
        link.title?.toLowerCase().includes(query) ||
        link.custom_slug?.toLowerCase().includes(query)
      );
    });
  }, [links, searchQuery]);

  // ===== URL validation =====
  const validateUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateSlug = (slug) => /^[a-zA-Z0-9_-]+$/.test(slug);

  // ===== Create link =====
  const handleCreateLink = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.target_url) {
      newErrors.target_url = 'URL is required';
    } else if (!validateUrl(formData.target_url)) {
      newErrors.target_url = 'Please enter a valid URL (include https://)';
    }

    if (formData.custom_slug && !validateSlug(formData.custom_slug)) {
      newErrors.custom_slug = 'Only letters, numbers, hyphens, and underscores';
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    setCreating(true);
    try {
      const payload = {
        target_url: formData.target_url,
        ...(formData.custom_slug && { custom_slug: formData.custom_slug }),
        ...(formData.title && { title: formData.title }),
      };
      const response = await api.post('/links/', payload);
      setLinks((prev) => [response.data, ...prev]);
      toast.success('Link created successfully!');
      setFormData({ target_url: '', custom_slug: '', title: '' });
      setFormErrors({});
      setShowCreateForm(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create link');
    } finally {
      setCreating(false);
    }
  };

  // ===== Copy to clipboard =====
  const copyToClipboard = async (shortCode) => {
    const shortUrl = `${BASE_URL}/${shortCode}`;
    try {
      await navigator.clipboard.writeText(shortUrl);
      toast.success('Copied to clipboard!');
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shortUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Copied to clipboard!');
    }
  };

  // ===== Delete link =====
  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/links/${id}`);
      setLinks((prev) => prev.filter((link) => link.id !== id));
      if (selectedLink?.id === id) {
        setDrawerOpen(false);
        setSelectedLink(null);
      }
      toast.success('Link deleted');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete link');
    } finally {
      setDeletingId(null);
    }
  };

  // ===== View QR =====
  const handleViewQR = async (link) => {
    setQrLink(link);
    setQrLoading(true);
    setQrImage(null);
    try {
      const response = await api.get(`/links/${link.id}/qr`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      setQrImage(url);
    } catch {
      toast.error('Failed to load QR code');
    } finally {
      setQrLoading(false);
    }
  };

  // ===== Open drawer =====
  const openDrawer = (link) => {
    setSelectedLink(link);
    setDrawerOpen(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isExpired = (link) => {
    if (!link.expires_at) return false;
    return new Date(link.expires_at) <= new Date();
  };

  const getShortUrl = (link) => `${BASE_URL}/${link.short_code}`;

  // ===== Sidebar nav items =====
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'links', label: 'My Links', icon: LinkIcon },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ];

  // ===== Loading state =====
  if (loading) {
    return (
      <div className="flex min-h-screen w-full bg-slate-950 text-slate-100 overflow-x-hidden font-sans">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh] w-full">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="text-sm text-slate-500">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-950 text-slate-100">
      {/* ===== Sidebar ===== */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col h-screen sticky top-0 shrink-0">
          <div className="flex h-full flex-col justify-between p-4">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveNav(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-800 text-slate-100'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="space-y-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-900">
                    <User className="h-4 w-4 text-indigo-200" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-100">{user?.username || 'User'}</p>
                    <p className="truncate text-xs text-slate-400">{user?.email || ''}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-red-900 hover:text-red-300"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ===== Main content ===== */}
        <main className="flex-1 min-w-0 flex flex-col bg-slate-950 p-6 md:p-8">
          <div className="space-y-6 w-full max-w-none">
            {/* Mobile menu button */}
            <button
            onClick={() => setSidebarOpen(true)}
            className="mb-4 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100 shadow-sm shadow-black/20 lg:hidden"
          >
            <Menu className="h-4 w-4" />
            Menu
          </button>

          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
                Dashboard
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Manage and track all your shortened links in one place.
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-indigo-700 active:scale-95"
            >
              {showCreateForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showCreateForm ? 'Cancel' : 'Create Link'}
            </button>
          </div>

          {/* ===== URL Shortening Form ===== */}
          {showCreateForm && (
            <div className="mb-6 animate-fadeIn rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6 shadow-sm shadow-slate-900/60">
              <h2 className="mb-4 text-lg font-semibold text-slate-100">Create New Short Link</h2>
              <form onSubmit={handleCreateLink} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Destination URL <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="url"
                      value={formData.target_url}
                      onChange={(e) => {
                        setFormData({ ...formData, target_url: e.target.value });
                        if (formErrors.target_url) setFormErrors({ ...formErrors, target_url: '' });
                      }}
                      placeholder="https://example.com/very-long-url"
                      className={`w-full rounded-lg border bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder-slate-500 shadow-sm shadow-black/40 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        formErrors.target_url ? 'border-red-600' : 'border-slate-800'
                      }`}
                    />
                  </div>
                  {formErrors.target_url && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.target_url}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">
                      Title <span className="text-slate-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="My Awesome Link"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 placeholder-slate-500 shadow-sm shadow-black/40 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">
                      Custom Slug <span className="text-slate-500">(optional)</span>
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1 shadow-sm">
                      <span className="text-sm text-slate-400">nexus.links/</span>
                      <input
                        type="text"
                        value={formData.custom_slug}
                        onChange={(e) => {
                          setFormData({ ...formData, custom_slug: e.target.value });
                          if (formErrors.custom_slug) setFormErrors({ ...formErrors, custom_slug: '' });
                        }}
                        placeholder="my-custom-slug"
                        className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                    {formErrors.custom_slug && (
                      <p className="mt-1 text-xs text-red-500">{formErrors.custom_slug}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 shadow-sm shadow-black/30 transition-colors hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creating ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </span>
                    ) : (
                      'Create Link'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ===== Error state ===== */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-700 bg-slate-900 p-4">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-200">{error}</p>
                <button
                  onClick={fetchLinks}
                  className="mt-2 text-sm font-medium text-red-300 hover:text-red-200"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* ===== Stats Cards ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-8">
            {/* Total Links */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm shadow-black/40 transition-all duration-200 hover:border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Links</p>
                  <p className="mt-2 text-3xl font-bold text-slate-100 tabular-nums">
                    {stats.totalLinks.toLocaleString()}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800">
                  <LinkIcon className="h-5 w-5 text-slate-200" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-sm text-slate-300">
                <TrendingUp className="h-4 w-4 text-slate-300" />
                <span className="font-medium text-slate-200">All time</span>
                <span>links created</span>
              </div>
            </div>

            {/* Total Clicks */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm shadow-black/40 transition-all duration-200 hover:border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Clicks</p>
                  <p className="mt-2 text-3xl font-bold text-slate-100 tabular-nums">
                    {stats.totalClicks.toLocaleString()}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800">
                  <MousePointerClick className="h-5 w-5 text-slate-200" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-sm text-slate-300">
                <Activity className="h-4 w-4 text-slate-300" />
                <span className="font-medium text-slate-200">Engagement</span>
                <span>across all links</span>
              </div>
            </div>

            {/* Active Links */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm shadow-black/40 transition-all duration-200 hover:border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Links</p>
                  <p className="mt-2 text-3xl font-bold text-slate-100 tabular-nums">
                    {stats.activeLinks.toLocaleString()}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800">
                  <Zap className="h-5 w-5 text-slate-200" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-sm text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-slate-300" />
                <span className="font-medium text-slate-200">Live</span>
                <span>currently active</span>
              </div>
            </div>

            {/* Avg Clicks per Link */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm shadow-black/40 transition-all duration-200 hover:border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Clicks / Link</p>
                  <p className="mt-2 text-3xl font-bold text-slate-100 tabular-nums">
                    {stats.avgClicks.toLocaleString()}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800">
                  <Target className="h-5 w-5 text-slate-200" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-sm text-slate-300">
                {stats.avgClicks > 0 ? (
                  <>
                    <ArrowUpRight className="h-4 w-4 text-slate-300" />
                    <span className="font-medium text-slate-200">Healthy</span>
                    <span>performance</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-4 w-4 text-slate-300" />
                    <span className="font-medium text-slate-300">No clicks</span>
                    <span>yet</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ===== Search bar ===== */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search links by URL, title, or slug..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-3.5 pl-11 pr-4 text-sm text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="text-sm text-slate-400">
              {filteredLinks.length} of {links.length} links
            </div>
          </div>

          {/* ===== Links Table ===== */}
          {filteredLinks.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm shadow-black/40 w-full min-h-[300px] flex items-center justify-center">
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800">
                  <Link2 className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-100">
                  {searchQuery ? 'No matching links' : 'No links yet'}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {searchQuery
                    ? 'Try a different search term.'
                    : 'Create your first shortened link to get started.'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" />
                    Create Link
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm shadow-black/40 w-full">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/90">
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-400">Original URL</th>
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Short Link</th>
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Clicks</th>
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">Created</th>
                      <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredLinks.map((link) => {
                      const expired = isExpired(link);
                      return (
                        <tr key={link.id} className="transition-colors hover:bg-slate-900/80">
                          <td className="px-5 py-4">
                            <button
                              onClick={() => openDrawer(link)}
                              className="flex items-center gap-3 min-w-0 text-left group"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                                <Link2 className="h-4 w-4 text-indigo-200" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-100 max-w-[220px] group-hover:text-indigo-400">
                                  {link.title || link.target_url}
                                </p>
                                {link.title && (
                                  <p className="truncate text-xs text-slate-500 max-w-[220px]">{link.target_url}</p>
                                )}
                              </div>
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-indigo-200">/{link.short_code}</span>
                              <button
                                onClick={() => copyToClipboard(link.short_code)}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-100"
                                title="Copy to clipboard"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <a
                                href={getShortUrl(link)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-100"
                                title="Open in new tab"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-indigo-200 tabular-nums">
                              <MousePointerClick className="h-3 w-3" />
                              {link.clicks}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {expired ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-900/40 px-2.5 py-1 text-xs font-medium text-red-300">
                                <Clock className="h-3 w-3" />
                                Expired
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/40 px-2.5 py-1 text-xs font-medium text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" />
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(link.created_at)}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openDrawer(link)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-100"
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleViewQR(link)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-100"
                                title="View QR Code"
                              >
                                <QrCode className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(link.id)}
                                disabled={deletingId === link.id}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-900 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Delete link"
                              >
                                {deletingId === link.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-slate-800">
                {filteredLinks.map((link) => {
                  const expired = isExpired(link);
                  return (
                    <div key={link.id} className="p-4">
                      <button
                        onClick={() => openDrawer(link)}
                        className="flex items-start gap-3 w-full text-left"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                          <Link2 className="h-4.5 w-4.5 text-indigo-200" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-100">
                            {link.title || link.target_url}
                          </p>
                          <p className="truncate text-xs text-slate-400">{link.target_url}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-indigo-200">/{link.short_code}</span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              expired ? 'bg-red-900/40 text-red-300' : 'bg-emerald-900/40 text-emerald-300'
                            }`}>
                              {expired ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                              {expired ? 'Expired' : 'Active'}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-indigo-200">
                              <MousePointerClick className="h-3 w-3" />
                              {link.clicks}
                            </span>
                          </div>
                        </div>
                      </button>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          <Calendar className="mr-1 inline h-3 w-3" />
                          {formatDate(link.created_at)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyToClipboard(link.short_code)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-100"
                            title="Copy"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleViewQR(link)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-100"
                            title="QR Code"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(link.id)}
                            disabled={deletingId === link.id}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-900 hover:text-red-300 disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === link.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </div>
        </main>

      {/* ===== URL Details Drawer ===== */}
      {drawerOpen && selectedLink && (
        <div className="fixed inset-0 z-[90]">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => { setDrawerOpen(false); setSelectedLink(null); }}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-md animate-slideInFromBottom sm:animate-none bg-slate-950 border-l border-slate-800 shadow-2xl shadow-black/30 flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-100">Link Details</h3>
              <button
                onClick={() => { setDrawerOpen(false); setSelectedLink(null); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Title */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Title</p>
                <p className="mt-1 text-base font-medium text-slate-100">
                  {selectedLink.title || 'Untitled link'}
                </p>
              </div>

              {/* Original URL */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Original URL</p>
                <a
                  href={selectedLink.target_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block break-all text-sm text-indigo-200 hover:text-indigo-300 hover:underline"
                >
                  {selectedLink.target_url}
                </a>
              </div>

              {/* Short URL */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Short URL</p>
                <div className="mt-1 flex items-center gap-2">
                  <a
                    href={getShortUrl(selectedLink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 truncate text-sm font-medium text-indigo-200 hover:text-indigo-300 hover:underline"
                  >
                    {getShortUrl(selectedLink)}
                  </a>
                  <button
                    onClick={() => copyToClipboard(selectedLink.short_code)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-100"
                    title="Copy"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Clicks</p>
                  <p className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">
                    {selectedLink.clicks.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</p>
                  <p className={`mt-1 text-2xl font-bold ${isExpired(selectedLink) ? 'text-red-500' : 'text-emerald-400'}`}>
                    {isExpired(selectedLink) ? 'Expired' : 'Active'}
                  </p>
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Short Code</span>
                  <span className="font-medium text-slate-100">/{selectedLink.short_code}</span>
                </div>
                {selectedLink.custom_slug && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Custom Slug</span>
                    <span className="font-medium text-slate-100">/{selectedLink.custom_slug}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Created</span>
                  <span className="font-medium text-slate-100">{formatDateTime(selectedLink.created_at)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Expires</span>
                  <span className={`font-medium ${isExpired(selectedLink) ? 'text-red-500' : 'text-slate-100'}`}>
                    {selectedLink.expires_at ? formatDateTime(selectedLink.expires_at) : 'Never'}
                  </span>
                </div>
              </div>
            </div>

            {/* Drawer footer */}
            <div className="border-t border-slate-800 px-6 py-4">
              <div className="flex gap-3">
                <button
                  onClick={() => handleViewQR(selectedLink)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-100 shadow-sm shadow-black/20 transition-colors hover:bg-slate-800"
                >
                  <QrCode className="h-4 w-4" />
                  QR Code
                </button>
                <button
                  onClick={() => handleDelete(selectedLink.id)}
                  disabled={deletingId === selectedLink.id}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60"
                >
                  {deletingId === selectedLink.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== QR Code Modal ===== */}
      {qrLink && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => { setQrLink(null); setQrImage(null); }}
          />
          <div className="relative w-full max-w-sm animate-scaleIn rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-100">QR Code</h3>
              <button
                onClick={() => { setQrLink(null); setQrImage(null); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-4">
              {qrLoading ? (
                <div className="flex h-48 w-48 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                </div>
              ) : qrImage ? (
                <img src={qrImage} alt="QR Code" className="h-48 w-48 rounded-lg" />
              ) : null}
              <p className="text-sm text-slate-400 text-center break-all">{qrLink.target_url}</p>
              <a
                href={qrImage}
                download={`qr-${qrLink.short_code}.png`}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-indigo-700"
              >
                Download QR Code
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}