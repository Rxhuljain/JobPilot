import { useEffect, useState } from 'react';
import { Plus, Save, Trash2, Star, Mail, CheckCircle, AlertCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { EmailTemplate } from '../../types/database';

const VARIABLES = [
  '{{applicant_name}}', '{{applicant_email}}', '{{applicant_phone}}', '{{applicant_title}}',
  '{{experience_years}}', '{{linkedin_url}}', '{{job_title}}', '{{company_name}}',
  '{{job_location}}', '{{skills}}', '{{resume_name}}',
];

const DEFAULT_TEMPLATES = [
  {
    name: 'Standard Application',
    template_type: 'application' as const,
    subject: 'Application for {{job_title}} - {{applicant_name}}',
    body: `Dear Hiring Manager,

I am writing to express my strong interest in the {{job_title}} position at {{company_name}}.

With {{experience_years}} years of experience as a {{applicant_title}}, I bring hands-on expertise in {{skills}}. I am confident that my background aligns well with your requirements and I would be excited to contribute to {{company_name}}'s continued growth.

Please find my resume attached for your review. I would welcome the opportunity to discuss how my skills and experience can benefit your team.

Thank you for considering my application. I look forward to hearing from you.

Best regards,
{{applicant_name}}
{{applicant_email}} | {{applicant_phone}}
{{linkedin_url}}`,
    variables: VARIABLES,
    is_default: true,
  },
  {
    name: 'Follow-up Email',
    template_type: 'followup' as const,
    subject: 'Follow-up: {{job_title}} Application - {{applicant_name}}',
    body: `Dear Hiring Manager,

I hope this email finds you well. I recently applied for the {{job_title}} position at {{company_name}} and wanted to follow up on the status of my application.

I remain very enthusiastic about this opportunity and believe my experience in {{skills}} would be a great fit for your team.

Please let me know if you need any additional information from my side.

Best regards,
{{applicant_name}}
{{applicant_email}}`,
    variables: VARIABLES,
    is_default: false,
  },
  {
    name: 'Networking Outreach',
    template_type: 'networking' as const,
    subject: 'Exploring Opportunities at {{company_name}} - {{applicant_name}}',
    body: `Hello,

I came across {{company_name}} and was impressed by your work. I am a {{applicant_title}} with {{experience_years}} years of experience specialising in {{skills}}.

I would love to explore if there are any suitable opportunities on your team where I could contribute meaningfully.

My LinkedIn profile: {{linkedin_url}}

Would you have 15 minutes for a quick call? I would be happy to share more about my background.

Thanks,
{{applicant_name}}
{{applicant_email}} | {{applicant_phone}}`,
    variables: VARIABLES,
    is_default: false,
  },
];

export default function TemplatesPage({ userId }: { userId: string }) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editing, setEditing] = useState<Partial<EmailTemplate> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [seeded, setSeeded] = useState(false);

  useEffect(() => { loadTemplates(); }, [userId]);

  async function loadTemplates() {
    const { data } = await supabase.from('email_templates').select('*').eq('user_id', userId).order('created_at');
    setTemplates(data || []);
    setSeeded((data || []).length > 0);
  }

  async function seedDefaults() {
    for (const tpl of DEFAULT_TEMPLATES) {
      await supabase.from('email_templates').insert({ ...tpl, user_id: userId });
    }
    await loadTemplates();
    setSuccess('Default templates added!');
  }

  async function handleSave() {
    if (!editing?.name || !editing?.subject || !editing?.body) {
      setError('Name, subject, and body are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isNew) {
        await supabase.from('email_templates').insert({ ...editing, user_id: userId });
      } else {
        await supabase.from('email_templates').update({ ...editing }).eq('id', editing.id!);
      }
      setSuccess('Template saved!');
      setEditing(null);
      await loadTemplates();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(id: string) {
    await supabase.from('email_templates').update({ is_default: false }).eq('user_id', userId);
    await supabase.from('email_templates').update({ is_default: true }).eq('id', id);
    await loadTemplates();
  }

  async function deleteTemplate(id: string) {
    await supabase.from('email_templates').delete().eq('id', id);
    await loadTemplates();
  }

  function insertVariable(v: string) {
    setEditing((e) => e ? { ...e, body: (e.body || '') + v } : e);
  }

  const TYPE_COLORS: Record<string, string> = {
    application: 'bg-blue-100 text-blue-700',
    followup: 'bg-amber-100 text-amber-700',
    networking: 'bg-teal-100 text-teal-700',
    referral: 'bg-green-100 text-green-700',
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Email Templates</h1>
          <p className="text-slate-500 text-sm mt-1">Customise templates for automated outreach and applications</p>
        </div>
        <div className="flex gap-2">
          {!seeded && (
            <button onClick={seedDefaults} className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-sm transition-colors">
              Load Defaults
            </button>
          )}
          <button
            onClick={() => { setEditing({ name: '', subject: '', body: '', template_type: 'application', variables: VARIABLES, is_default: false }); setIsNew(true); setError(''); setSuccess(''); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> New Template
          </button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-600 mb-4">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className={`bg-white border rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer ${editing?.id === tpl.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'}`}
            onClick={() => { setEditing({ ...tpl }); setIsNew(false); setError(''); setSuccess(''); }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-slate-900 text-sm truncate">{tpl.name}</p>
                    {tpl.is_default && <Star className="w-3 h-3 text-amber-500 flex-shrink-0" fill="currentColor" />}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{tpl.subject}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[tpl.template_type]}`}>{tpl.template_type}</span>
                {!tpl.is_default && (
                  <button onClick={(e) => { e.stopPropagation(); setDefault(tpl.id); }} title="Set as default" className="p-1 text-slate-400 hover:text-amber-500 transition-colors">
                    <Star className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); deleteTemplate(tpl.id); }} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 line-clamp-2 leading-relaxed">{tpl.body.slice(0, 120)}...</p>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl py-16 text-center">
            <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No templates yet</p>
            <p className="text-slate-400 text-xs mt-1 mb-5">Create templates or load the defaults to get started</p>
            <button onClick={seedDefaults} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              Load Default Templates
            </button>
          </div>
        )}
      </div>

      {/* Editor panel */}
      {editing && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-800">{isNew ? 'New Template' : 'Edit Template'}</h2>
            <button onClick={() => setEditing(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Template Name</label>
              <input className={inputCls} value={editing.name || ''} onChange={(e) => setEditing((ed) => ({ ...ed!, name: e.target.value }))} placeholder="e.g. Standard Application" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Type</label>
              <select className={inputCls} value={editing.template_type || 'application'} onChange={(e) => setEditing((ed) => ({ ...ed!, template_type: e.target.value as EmailTemplate['template_type'] }))}>
                <option value="application">Application</option>
                <option value="followup">Follow-up</option>
                <option value="networking">Networking</option>
                <option value="referral">Referral</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Subject Line</label>
            <input className={inputCls} value={editing.subject || ''} onChange={(e) => setEditing((ed) => ({ ...ed!, subject: e.target.value }))} placeholder="Application for {{job_title}} - {{applicant_name}}" />
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-600">Email Body</label>
              <p className="text-xs text-slate-400">Click variables to insert</p>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {VARIABLES.map((v) => (
                <button key={v} type="button" onClick={() => insertVariable(v)}
                  className="text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-2 py-0.5 rounded-full transition-colors font-mono">
                  {v}
                </button>
              ))}
            </div>
            <textarea
              className={`${inputCls} h-64 resize-y font-mono text-xs`}
              value={editing.body || ''}
              onChange={(e) => setEditing((ed) => ({ ...ed!, body: e.target.value }))}
              placeholder="Write your email body here. Use {{variable}} placeholders..."
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 mb-4">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl text-sm transition-colors">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Template'}
            </button>
            <button onClick={() => setEditing(null)}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium rounded-xl text-sm transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white';
