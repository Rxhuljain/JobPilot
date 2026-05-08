import { useEffect, useState } from 'react';
import {
  Search, RefreshCw, MapPin, Briefcase, Clock, ExternalLink,
  Send, Mail, ChevronDown, ChevronUp, Zap,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchJobs, formatSalary, timeAgo, SOURCE_LABELS } from '../../lib/api';
import type { JobListing, EmailTemplate, Resume } from '../../types/database';

export default function JobsPage({ userId }: { userId: string }) {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [filtered, setFiltered] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [primaryResume, setPrimaryResume] = useState<Resume | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadTemplates();
    loadPrimaryResume();
  }, [userId]);

  useEffect(() => {
    let list = jobs;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((j) => j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.location.toLowerCase().includes(q) || j.skills_required.some((s) => s.toLowerCase().includes(q)));
    }
    if (sourceFilter !== 'all') list = list.filter((j) => j.source === sourceFilter);
    setFiltered(list);
  }, [jobs, search, sourceFilter]);

  async function loadTemplates() {
    const { data } = await supabase.from('email_templates').select('*').eq('user_id', userId);
    setTemplates(data || []);
  }

  async function loadPrimaryResume() {
    const { data } = await supabase.from('resumes').select('*').eq('user_id', userId).eq('is_primary', true).maybeSingle();
    setPrimaryResume(data);
  }

  async function handleFetch() {
    setLoading(true);
    try {
      const result = await fetchJobs();
      setJobs(result.jobs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function applyNow(job: JobListing, method: 'portal' | 'email') {
    setApplying(job.id);
    try {
      const defaultTemplate = templates.find((t) => t.is_default) || templates[0] || null;
      const { data: app, error } = await supabase.from('applications').insert({
        user_id: userId,
        job_listing_id: job.id,
        email_template_id: defaultTemplate?.id || null,
        resume_id: primaryResume?.id || null,
        status: 'pending',
        application_method: method,
        match_score: job.match_score || 0,
        company_name: job.company,
        job_title: job.title,
        job_location: job.location,
        apply_url: job.apply_url,
        company_email: job.company_email || '',
      }).select().maybeSingle();

      if (error) throw error;

      await supabase.from('application_logs').insert({
        application_id: app!.id,
        user_id: userId,
        event_type: 'created',
        message: `Application created for ${job.title} at ${job.company}`,
        event_data: { method },
      });

      if (method === 'portal') {
        window.open(job.apply_url, '_blank');
        await supabase.from('applications').update({ status: 'submitted', applied_at: new Date().toISOString() }).eq('id', app!.id);
      }

      showToast(`Application ${method === 'portal' ? 'opened in new tab' : 'queued for email'} — ${job.title}`);
    } catch (err) {
      console.error(err);
      showToast('Failed to create application');
    } finally {
      setApplying(null);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  const sources = ['all', ...Array.from(new Set(jobs.map((j) => j.source)))];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Find Jobs</h1>
          <p className="text-slate-500 text-sm mt-1">Matching opportunities from Naukri, Indeed, LinkedIn & more</p>
        </div>
        <button
          onClick={handleFetch}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl text-sm transition-colors"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {loading ? 'Fetching...' : 'Fetch Jobs'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by title, company, skill, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
        >
          {sources.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Platforms' : SOURCE_LABELS[s] || s}</option>)}
        </select>
      </div>

      {jobs.length === 0 && !loading && (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center">
          <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No jobs loaded yet</p>
          <p className="text-slate-400 text-xs mt-1 mb-5">Click "Fetch Jobs" to pull opportunities matched to your profile</p>
          <button onClick={handleFetch} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            Fetch Jobs Now
          </button>
        </div>
      )}

      {/* Job cards */}
      <div className="space-y-3">
        {filtered.map((job) => (
          <div key={job.id} className="bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-slate-700 text-xs font-bold">{job.company[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <h3 className="font-semibold text-slate-900 text-sm">{job.title}</h3>
                    {job.match_score !== undefined && job.match_score > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        job.match_score >= 70 ? 'bg-green-100 text-green-700' :
                        job.match_score >= 40 ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>{job.match_score}% match</span>
                    )}
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{SOURCE_LABELS[job.source]}</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{job.company}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                    <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{job.experience_min}–{job.experience_max} yrs</span>
                    <span>{formatSalary(job.salary_min, job.salary_max)}</span>
                    {job.posted_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(job.posted_at)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => applyNow(job, 'portal')}
                    disabled={applying === job.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Apply
                  </button>
                  {job.company_email && (
                    <button
                      onClick={() => applyNow(job, 'email')}
                      disabled={applying === job.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      <Mail className="w-3 h-3" />
                      Email
                    </button>
                  )}
                  <button
                    onClick={() => setExpanded(expanded === job.id ? null : job.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {expanded === job.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Skills */}
              {job.skills_required.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {job.skills_required.slice(0, 8).map((s) => (
                    <span key={s} className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Expanded description */}
            {expanded === job.id && (
              <div className="border-t border-slate-100 px-5 py-4 bg-slate-50">
                <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{job.description}</p>
                <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium">
                  <ExternalLink className="w-4 h-4" /> View full job posting
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && jobs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl py-12 text-center">
          <p className="text-slate-500 text-sm">No jobs match your search. Try different keywords.</p>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in">
          <Send className="w-4 h-4 text-green-400" />
          {toast}
        </div>
      )}
    </div>
  );
}
