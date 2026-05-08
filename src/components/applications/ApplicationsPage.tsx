import { useEffect, useState } from 'react';
import { Send, MapPin, Clock, ChevronDown, Trash2, RefreshCw, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { submitApplication, STATUS_COLORS, timeAgo } from '../../lib/api';
import type { Application } from '../../types/database';

const STATUSES = ['pending', 'submitted', 'opened', 'replied', 'rejected', 'shortlisted', 'interview_scheduled', 'offered'] as const;

export default function ApplicationsPage({ userId }: { userId: string }) {
  const [apps, setApps] = useState<Application[]>([]);
  const [filtered, setFiltered] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => { loadApps(); }, [userId]);
  useEffect(() => {
    setFiltered(statusFilter === 'all' ? apps : apps.filter((a) => a.status === statusFilter));
  }, [apps, statusFilter]);

  async function loadApps() {
    const { data } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setApps(data || []);
    setLoading(false);
  }

  async function handleStatusChange(id: string, status: Application['status']) {
    await supabase.from('applications').update({ status, last_status_change: new Date().toISOString() }).eq('id', id);
    await supabase.from('application_logs').insert({
      application_id: id,
      user_id: userId,
      event_type: 'status_changed',
      message: `Status changed to ${status}`,
      event_data: { status },
    });
    await loadApps();
  }

  async function handleSubmit(app: Application) {
    setSubmitting(app.id);
    try {
      await submitApplication(app.id, app.application_method as 'portal' | 'email');
      showToast('Application submitted successfully!');
      await loadApps();
    } catch (err) {
      console.error(err);
      showToast('Submission failed. Try again.');
    } finally {
      setSubmitting(null);
    }
  }

  async function deleteApp(id: string) {
    await supabase.from('applications').delete().eq('id', id);
    await loadApps();
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  if (loading) return (
    <div className="p-8">
      <div className="h-8 w-48 bg-slate-200 rounded-xl animate-pulse mb-8" />
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse mb-3" />)}
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Applications</h1>
          <p className="text-slate-500 text-sm mt-1">{apps.length} total application{apps.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <FilterTab label="All" value="all" current={statusFilter} count={apps.length} onClick={setStatusFilter} />
        {STATUSES.map((s) => {
          const count = apps.filter((a) => a.status === s).length;
          return count > 0 ? <FilterTab key={s} label={s.replace('_', ' ')} value={s} current={statusFilter} count={count} onClick={setStatusFilter} /> : null;
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center">
          <Send className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No applications {statusFilter !== 'all' ? `with status "${statusFilter}"` : 'yet'}</p>
          <p className="text-slate-400 text-xs mt-1">Go to Find Jobs to start applying</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <div key={app.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-slate-700 text-xs font-bold">{(app.company_name || 'C')[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-semibold text-slate-900 text-sm">{app.job_title}</p>
                      {app.match_score > 0 && (
                        <span className="text-xs text-slate-400">{app.match_score}% match</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{app.company_name}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      {app.job_location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{app.job_location}</span>}
                      <span className="capitalize">{app.application_method} application</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(app.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Status selector */}
                    <div className="relative">
                      <select
                        value={app.status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value as Application['status'])}
                        className={`text-xs pl-2.5 pr-6 py-1.5 rounded-full font-medium border-0 appearance-none cursor-pointer ${STATUS_COLORS[app.status]}`}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60" />
                    </div>
                    {app.status === 'pending' && (
                      <button
                        onClick={() => handleSubmit(app)}
                        disabled={submitting === app.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        {submitting === app.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Submit
                      </button>
                    )}
                    {app.cover_letter && (
                      <button
                        onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View cover letter"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteApp(app.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Cover letter preview */}
              {expandedId === app.id && app.cover_letter && (
                <div className="border-t border-slate-100 px-5 py-4 bg-slate-50">
                  <p className="text-xs font-medium text-slate-500 mb-2">Cover Letter / Email Body</p>
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{app.cover_letter}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function FilterTab({ label, value, current, count, onClick }: { label: string; value: string; current: string; count: number; onClick: (v: string) => void }) {
  const active = current === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
        active ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
      }`}
    >
      {label}
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
    </button>
  );
}
