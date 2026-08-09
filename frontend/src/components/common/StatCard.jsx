import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ icon: Icon, label, value, trend, trendUp = true, color = 'primary' }) {
  const bgMap = {
    primary: 'bg-indigo-50',
    success: 'bg-emerald-50',
    warning: 'bg-amber-50',
    danger: 'bg-rose-50',
  };

  const iconColorMap = {
    primary: 'text-indigo-600',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-rose-600',
  };

  return (
    <div className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-xl shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="text-3xl font-bold text-slate-900 tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {trend !== undefined && (
          <div className="flex items-center gap-1.5 mt-2">
            {trendUp ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className={`text-sm font-medium ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend}%
            </span>
            <span className="text-sm text-slate-400">vs last month</span>
          </div>
        )}
      </div>

      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bgMap[color]} transition-colors duration-200`}>
        <Icon className={`h-6 w-6 ${iconColorMap[color]}`} />
      </div>
    </div>
  );
}