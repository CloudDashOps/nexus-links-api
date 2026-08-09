import { useState } from 'react';
import { Copy, ExternalLink, QrCode, Trash2, Calendar, MousePointerClick, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function LinkTable({ links, onDelete, onViewQR }) {
  const [deletingId, setDeletingId] = useState(null);

  const copyToClipboard = async (shortCode) => {
    const shortUrl = `http://127.0.0.1:8000/${shortCode}`;
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

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/links/${id}`);
      toast.success('Link deleted');
      onDelete(id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete link');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (links.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-12 min-h-[350px] flex items-center justify-center">
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Link2 className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No links yet</h3>
          <p className="mt-1 text-sm text-slate-500">Create your first shortened link to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden mb-8">
      {/* Header Row */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 px-6 py-4 bg-slate-50/80 border-b border-slate-100">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Original URL</div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Short Link</div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Clicks</div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Created</div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</div>
      </div>

      {/* Data Rows */}
      <div className="divide-y divide-slate-100">
        {links.map((link) => (
          <div
            key={link.id}
            className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors duration-150"
          >
            {/* Original URL */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                <Link2 className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900 max-w-[200px] lg:max-w-[280px]">
                  {link.title || link.target_url}
                </p>
                {link.title && (
                  <p className="truncate text-xs text-slate-400 max-w-[200px] lg:max-w-[280px]">
                    {link.target_url}
                  </p>
                )}
              </div>
            </div>

            {/* Short Link */}
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-indigo-600">
                /{link.short_code}
              </span>
              <button
                onClick={() => copyToClipboard(link.short_code)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-600"
                title="Copy to clipboard"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <a
                href={`http://127.0.0.1:8000/${link.short_code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-600"
                title="Open in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* Clicks */}
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                <MousePointerClick className="h-3 w-3" />
                {link.clicks}
              </span>
            </div>

            {/* Date */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(link.created_at)}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => onViewQR(link)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-600"
                title="View QR Code"
              >
                <QrCode className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(link.id)}
                disabled={deletingId === link.id}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                title="Delete link"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}