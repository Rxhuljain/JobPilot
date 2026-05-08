import { useEffect, useRef, useState } from 'react';
import { Upload, FileText, Trash2, Star, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { parseResume } from '../../lib/api';
import type { Resume } from '../../types/database';

export default function ResumePage({ userId }: { userId: string }) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadResumes(); }, [userId]);

  async function loadResumes() {
    const { data } = await supabase.from('resumes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setResumes(data || []);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext || '')) {
      setError('Only PDF, DOC, and DOCX files are supported.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const filePath = `${userId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('resumes').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: row, error: insertError } = await supabase.from('resumes').insert({
        user_id: userId,
        file_name: file.name,
        file_path: filePath,
        file_type: (ext as 'pdf' | 'doc' | 'docx'),
        file_size_bytes: file.size,
        is_primary: resumes.length === 0,
      }).select().maybeSingle();
      if (insertError) throw insertError;

      await loadResumes();

      // Auto-parse
      if (row) {
        setParsing(row.id);
        try {
          await parseResume(file, row.id);
          setSuccess('Resume uploaded and parsed successfully!');
          await loadResumes();
        } catch {
          setSuccess('Resume uploaded. Parsing may take a moment.');
        } finally {
          setParsing(null);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function setPrimary(id: string) {
    await supabase.from('resumes').update({ is_primary: false }).eq('user_id', userId);
    await supabase.from('resumes').update({ is_primary: true }).eq('id', id);
    await loadResumes();
  }

  async function deleteResume(id: string, filePath: string) {
    await supabase.storage.from('resumes').remove([filePath]);
    await supabase.from('resumes').delete().eq('id', id);
    await loadResumes();
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Resume</h1>
        <p className="text-slate-500 text-sm mt-1">Upload your resume for automated parsing and job matching</p>
      </div>

      {/* Upload zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/40 rounded-2xl p-10 text-center cursor-pointer transition-all mb-6"
      >
        <div className="inline-flex p-4 bg-blue-50 rounded-2xl mb-4">
          <Upload className="w-6 h-6 text-blue-500" />
        </div>
        <p className="font-semibold text-slate-700 mb-1">
          {uploading ? 'Uploading...' : 'Drop your resume here or click to browse'}
        </p>
        <p className="text-sm text-slate-400">Supports PDF, DOC, DOCX · Max 5MB</p>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-600 mb-4">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Resume list */}
      <div className="space-y-4">
        {resumes.map((r) => (
          <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-slate-900 truncate">{r.file_name}</p>
                  {r.is_primary && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Primary</span>
                  )}
                  {r.parsed_at ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Parsed</span>
                  ) : parsing === r.id ? (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Parsing
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Not parsed</span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {(r.file_size_bytes / 1024).toFixed(0)} KB · {r.file_type.toUpperCase()} · Added {new Date(r.created_at).toLocaleDateString('en-IN')}
                </p>

                {r.extracted_skills?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Detected skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.extracted_skills.slice(0, 12).map((s) => (
                        <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                      {r.extracted_skills.length > 12 && (
                        <span className="text-xs text-slate-400">+{r.extracted_skills.length - 12} more</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!r.is_primary && (
                  <button
                    onClick={() => setPrimary(r.id)}
                    title="Set as primary"
                    className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteResume(r.id, r.file_path)}
                  title="Delete"
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {resumes.length === 0 && !uploading && (
          <div className="bg-white border border-slate-200 rounded-2xl py-14 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm">No resumes uploaded yet</p>
            <p className="text-slate-400 text-xs mt-1">Upload your resume to enable automated job matching</p>
          </div>
        )}
      </div>
    </div>
  );
}
