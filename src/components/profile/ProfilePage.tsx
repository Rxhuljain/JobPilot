import { useEffect, useState } from 'react';
import { Save, Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types/database';

const EXPERIENCE_LEVELS = [
  { value: 'fresher', label: 'Fresher (0 yr)' },
  { value: 'junior', label: 'Junior (1–2 yrs)' },
  { value: 'mid', label: 'Mid-level (3–5 yrs)' },
  { value: 'senior', label: 'Senior (6–9 yrs)' },
  { value: 'lead', label: 'Lead (10–14 yrs)' },
  { value: 'manager', label: 'Manager/Principal (15+ yrs)' },
];

const INDIAN_CITIES = [
  'Bangalore', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai', 'Delhi NCR',
  'Noida', 'Gurgaon', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Chandigarh',
  'Kochi', 'Indore', 'Nagpur', 'Coimbatore', 'Remote', 'Pan India',
];

export default function ProfilePage({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Partial<Profile>>({
    full_name: '', email: '', phone: '', current_title: '',
    experience_years: 0, experience_level: 'mid',
    preferred_roles: [], preferred_locations: [], skills: [],
    notice_period_days: 30, expected_salary_min: 0, expected_salary_max: 0,
    linkedin_url: '', portfolio_url: '', bio: '', is_actively_looking: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newRole, setNewRole] = useState('');

  useEffect(() => { loadProfile(); }, [userId]);

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
    if (data) setProfile(data);
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { data: existing } = await supabase.from('profiles').select('id').eq('user_id', userId).maybeSingle();
      if (existing) {
        const { error: e } = await supabase.from('profiles').update({ ...profile }).eq('user_id', userId);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('profiles').insert({ ...profile, user_id: userId });
        if (e) throw e;
      }
      setSuccess('Profile saved successfully!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function addSkill() {
    const s = newSkill.trim();
    if (s && !profile.skills?.includes(s)) {
      setProfile((p) => ({ ...p, skills: [...(p.skills || []), s] }));
    }
    setNewSkill('');
  }

  function addRole() {
    const r = newRole.trim();
    if (r && !profile.preferred_roles?.includes(r)) {
      setProfile((p) => ({ ...p, preferred_roles: [...(p.preferred_roles || []), r] }));
    }
    setNewRole('');
  }

  function toggleLocation(city: string) {
    setProfile((p) => {
      const locs = p.preferred_locations || [];
      return { ...p, preferred_locations: locs.includes(city) ? locs.filter((l) => l !== city) : [...locs, city] };
    });
  }

  if (loading) return <div className="p-8"><div className="h-8 w-48 bg-slate-200 rounded-xl animate-pulse" /></div>;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Your professional details used for job matching and applications</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        {/* Basic info */}
        <Section title="Basic Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full Name">
              <input className={inputCls} value={profile.full_name || ''} onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))} placeholder="Rahul Sharma" />
            </Field>
            <Field label="Email">
              <input className={inputCls} type="email" value={profile.email || ''} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} placeholder="rahul@example.com" />
            </Field>
            <Field label="Phone">
              <input className={inputCls} value={profile.phone || ''} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" />
            </Field>
            <Field label="Current Job Title">
              <input className={inputCls} value={profile.current_title || ''} onChange={(e) => setProfile((p) => ({ ...p, current_title: e.target.value }))} placeholder="Senior Software Engineer" />
            </Field>
          </div>
          <Field label="Bio / Summary">
            <textarea className={`${inputCls} h-24 resize-none`} value={profile.bio || ''} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} placeholder="Brief professional summary..." />
          </Field>
        </Section>

        {/* Experience */}
        <Section title="Experience & Availability">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Years of Experience">
              <input className={inputCls} type="number" min={0} max={50} value={profile.experience_years || 0} onChange={(e) => setProfile((p) => ({ ...p, experience_years: Number(e.target.value) }))} />
            </Field>
            <Field label="Experience Level">
              <select className={inputCls} value={profile.experience_level || 'mid'} onChange={(e) => setProfile((p) => ({ ...p, experience_level: e.target.value as Profile['experience_level'] }))}>
                {EXPERIENCE_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </Field>
            <Field label="Notice Period (days)">
              <input className={inputCls} type="number" min={0} value={profile.notice_period_days || 0} onChange={(e) => setProfile((p) => ({ ...p, notice_period_days: Number(e.target.value) }))} />
            </Field>
            <Field label="Actively Looking">
              <div className="flex items-center gap-3 pt-2.5">
                <button type="button" onClick={() => setProfile((p) => ({ ...p, is_actively_looking: !p.is_actively_looking }))}
                  className={`relative w-10 h-5.5 rounded-full transition-colors ${profile.is_actively_looking ? 'bg-blue-500' : 'bg-slate-300'}`}
                  style={{ height: 22 }}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${profile.is_actively_looking ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-slate-600">{profile.is_actively_looking ? 'Yes, actively looking' : 'Not actively looking'}</span>
              </div>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Expected Salary Min (₹/yr)">
              <input className={inputCls} type="number" min={0} step={50000} value={profile.expected_salary_min || 0} onChange={(e) => setProfile((p) => ({ ...p, expected_salary_min: Number(e.target.value) }))} placeholder="500000" />
            </Field>
            <Field label="Expected Salary Max (₹/yr)">
              <input className={inputCls} type="number" min={0} step={50000} value={profile.expected_salary_max || 0} onChange={(e) => setProfile((p) => ({ ...p, expected_salary_max: Number(e.target.value) }))} placeholder="1000000" />
            </Field>
          </div>
        </Section>

        {/* Skills */}
        <Section title="Skills">
          <div className="flex gap-2 mb-3">
            <input
              className={`${inputCls} flex-1`}
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              placeholder="e.g. React, Python, AWS..."
            />
            <button type="button" onClick={addSkill} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(profile.skills || []).map((s) => (
              <span key={s} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full">
                {s}
                <button type="button" onClick={() => setProfile((p) => ({ ...p, skills: p.skills?.filter((x) => x !== s) }))} className="hover:text-blue-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {(profile.skills || []).length === 0 && <p className="text-slate-400 text-sm">No skills added yet</p>}
          </div>
        </Section>

        {/* Preferred Roles */}
        <Section title="Preferred Job Roles">
          <div className="flex gap-2 mb-3">
            <input
              className={`${inputCls} flex-1`}
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRole())}
              placeholder="e.g. Frontend Developer, Data Engineer..."
            />
            <button type="button" onClick={addRole} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(profile.preferred_roles || []).map((r) => (
              <span key={r} className="flex items-center gap-1.5 bg-teal-50 text-teal-700 text-sm px-3 py-1 rounded-full">
                {r}
                <button type="button" onClick={() => setProfile((p) => ({ ...p, preferred_roles: p.preferred_roles?.filter((x) => x !== r) }))} className="hover:text-teal-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </Section>

        {/* Locations */}
        <Section title="Preferred Locations">
          <div className="flex flex-wrap gap-2">
            {INDIAN_CITIES.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => toggleLocation(city)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                  profile.preferred_locations?.includes(city)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </Section>

        {/* Links */}
        <Section title="Online Presence">
          <div className="grid grid-cols-2 gap-4">
            <Field label="LinkedIn URL">
              <input className={inputCls} value={profile.linkedin_url || ''} onChange={(e) => setProfile((p) => ({ ...p, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/..." />
            </Field>
            <Field label="Portfolio / Website">
              <input className={inputCls} value={profile.portfolio_url || ''} onChange={(e) => setProfile((p) => ({ ...p, portfolio_url: e.target.value }))} placeholder="https://yoursite.com" />
            </Field>
          </div>
        </Section>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-600">
            <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
          </div>
        )}

        <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl text-sm transition-colors">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h2 className="font-semibold text-slate-800 text-sm mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
