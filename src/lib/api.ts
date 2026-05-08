import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function edgeFn(slug: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session?.access_token ?? SUPABASE_ANON_KEY}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export async function fetchJobs() {
  return edgeFn('fetch-jobs');
}

export async function parseResume(file: File, resumeId: string) {
  const form = new FormData();
  form.append('file', file);
  form.append('resumeId', resumeId);
  return edgeFn('parse-resume', { method: 'POST', body: form });
}

export async function submitApplication(applicationId: string, method: 'portal' | 'email') {
  return edgeFn('send-application', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicationId, method }),
  });
}

export function formatSalary(min?: number | null, max?: number | null): string {
  if (!min && !max) return 'Not disclosed';
  const fmt = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${(n / 1000).toFixed(0)}K`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

export function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export const SOURCE_LABELS: Record<string, string> = {
  naukri: 'Naukri',
  indeed: 'Indeed',
  linkedin: 'LinkedIn',
  shine: 'Shine',
  timesjobs: 'TimesJobs',
  glassdoor: 'Glassdoor',
  instahyre: 'Instahyre',
  foundit: 'Foundit',
  manual: 'Manual',
};

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  opened: 'bg-yellow-100 text-yellow-700',
  replied: 'bg-teal-100 text-teal-700',
  rejected: 'bg-red-100 text-red-700',
  shortlisted: 'bg-green-100 text-green-700',
  interview_scheduled: 'bg-emerald-100 text-emerald-700',
  offered: 'bg-orange-100 text-orange-700',
};
