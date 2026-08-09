import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Link2, LogOut, User, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-slate-200/80">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 transition-transform duration-200 group-hover:scale-105">
              <Link2 className="h-5 w-5 text-indigo-600" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              Nexus<span className="text-indigo-600">Links</span>
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* User dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50">
                  <User className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="hidden sm:block">{user?.username || 'User'}</span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 animate-scaleIn rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl shadow-slate-900/5">
                  <div className="border-b border-slate-100 px-4 py-2.5">
                    <p className="text-sm font-medium text-slate-900">{user?.username}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { logout(); setDropdownOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}