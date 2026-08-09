import { useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Modal from '../common/Modal';

export default function CreateLinkModal({ isOpen, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    target_url: '',
    custom_slug: '',
    title: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateSlug = (slug) => {
    return /^[a-zA-Z0-9_-]+$/.test(slug);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
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
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        target_url: formData.target_url,
        ...(formData.custom_slug && { custom_slug: formData.custom_slug }),
        ...(formData.title && { title: formData.title }),
      };
      const response = await api.post('/links/', payload);
      toast.success('Link created successfully!');
      onCreated(response.data);
      setFormData({ target_url: '', custom_slug: '', title: '' });
      onClose();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create link';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Link">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* URL Input */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Destination URL <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="url"
              name="target_url"
              value={formData.target_url}
              onChange={handleChange}
              placeholder="https://example.com/very-long-url"
              className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${
                errors.target_url ? 'border-red-300' : 'border-slate-200'
              }`}
            />
          </div>
          {errors.target_url && (
            <p className="mt-1 text-xs text-red-500">{errors.target_url}</p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Title <span className="text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="My Awesome Link"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Custom Slug */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Custom Slug <span className="text-slate-400">(optional)</span>
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 shadow-sm">
            <span className="text-sm text-slate-500">nexus.links/</span>
            <input
              type="text"
              name="custom_slug"
              value={formData.custom_slug}
              onChange={handleChange}
              placeholder="my-custom-slug"
              className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
            />
          </div>
          {errors.custom_slug && (
            <p className="mt-1 text-xs text-red-500">{errors.custom_slug}</p>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
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
    </Modal>
  );
}