import {
  LayoutDashboard, FileText, User, Search, Send, Mail, LogOut, Briefcase, ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export type Page = 'dashboard' | 'resume' | 'profile' | 'jobs' | 'applications' | 'templates';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'jobs', label: 'Find Jobs', icon: Search },
  { id: 'applications', label: 'Applications', icon: Send },
  { id: 'resume', label: 'Resume', icon: FileText },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'templates', label: 'Email Templates', icon: Mail },
] as const;

interface Props {
  current: Page;
  onChange: (p: Page) => void;
  userName: string;
}

export default function Sidebar({ current, onChange, userName }: Props) {
  return (
    <aside className="w-60 min-h-screen bg-slate-900 flex flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Briefcase className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">JobPilot</p>
          <p className="text-slate-400 text-xs">India</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = current === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id as Page)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-slate-800 px-3 py-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{(userName || 'U')[0].toUpperCase()}</span>
          </div>
          <p className="text-slate-300 text-xs truncate">{userName}</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
