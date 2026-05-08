import { useEffect, useState } from 'react';
import { Send, CheckCircle, XCircle, Calendar, TrendingUp, Briefcase, Clock, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Application } from '../../types/database';
import { STATUS_COLORS, timeAgo } from '../../lib/api';

interface Stats {
  total: number;
  submitted: number;
  shortlisted: number;
  rejected: number;
  interviews: number;
  offers: number;
}

export default function Dashboard({ userId }: { userId: string }) {
  const [stats, setStats] = useState<Stats>({ total: 0, submitted: 0, shortlisted: 0, rejected: 0, interviews: 0, offers: 0 });
  const [recent, setRecent] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      const apps = data || [];
      setRecent(apps.slice(0, 8));
      setStats({
        total: apps.length,
        submitted: apps.filter((a) => ['submitted', 'opened', 'replied'].includes(a.status)).length,
        shortlisted: apps.filter((a) => a.status === 'shortlisted').length,
        rejected: apps.filter((a) => a.status === 'rejected').length,
        interviews: apps.filter((a) => a.status === 'interview_scheduled').length,
        offers: apps.filter((a) => a.status === 'offered').length,
      });
      setLoading(false);
    }
    load();
  }, [userId]);

  const cards = [
    { label: 'Total Applied', value: stats.total, icon: Send, color: 'bg-blue-50 text-blue-600' },
    { label: 'In Progress', value: stats.submitted, icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: 'Shortlisted', value: stats.shortlisted, icon: Award, color: 'bg-green-50 text-green-600' },
    { label: 'Interviews', value: stats.interviews, icon: Calendar, color: 'bg-teal-50 text-teal-600' },
    { label: 'Offers', value: stats.offers, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'bg-red-50 text-red-600' },
  ];

  if (loading) return <PageLoader />;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Track your automated job application pipeline</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className={`inline-flex p-2.5 rounded-xl mb-3 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Response rate */}
      {stats.total > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-slate-800 text-sm">Response Rate</h2>
            </div>
            <span className="text-2xl font-bold text-slate-900">
              {stats.total > 0 ? Math.round(((stats.shortlisted + stats.interviews + stats.offers) / stats.total) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all"
              style={{ width: `${Math.min(stats.total > 0 ? ((stats.shortlisted + stats.interviews + stats.offers) / stats.total) * 100 : 0, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">{stats.shortlisted + stats.interviews + stats.offers} positive responses out of {stats.total} applications</p>
        </div>
      )}

      {/* Recent Applications */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-slate-800 text-sm">Recent Applications</h2>
          </div>
        </div>
        {recent.length === 0 ? (
          <div className="py-16 text-center">
            <Send className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">No applications yet</p>
            <p className="text-slate-400 text-xs mt-1">Find jobs and start applying to see them here</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recent.map((app) => (
              <div key={app.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-slate-600 text-xs font-bold">{(app.company_name || 'C')[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{app.job_title}</p>
                  <p className="text-xs text-slate-500 truncate">{app.company_name} · {app.job_location}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {app.match_score > 0 && (
                    <span className="text-xs font-medium text-slate-500">{app.match_score}% match</span>
                  )}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[app.status]}`}>
                    {app.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-400 w-14 text-right">{timeAgo(app.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="p-8">
      <div className="h-8 w-48 bg-slate-200 rounded-xl animate-pulse mb-2" />
      <div className="h-4 w-72 bg-slate-100 rounded-xl animate-pulse mb-8" />
      <div className="grid grid-cols-6 gap-4 mb-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
    </div>
  );
}
