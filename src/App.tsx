import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import AuthPage from './components/auth/AuthPage';
import Sidebar, { type Page } from './components/layout/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import ResumePage from './components/resume/ResumePage';
import ProfilePage from './components/profile/ProfilePage';
import JobsPage from './components/jobs/JobsPage';
import ApplicationsPage from './components/applications/ApplicationsPage';
import TemplatesPage from './components/templates/TemplatesPage';
import { Briefcase } from 'lucide-react';

export default function App() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <p className="text-slate-500 text-sm">Loading JobPilot...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const userId = user.id;
  const userName = user.email || 'User';

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar current={page} onChange={setPage} userName={userName} />
      <main className="flex-1 overflow-auto">
        {page === 'dashboard' && <Dashboard userId={userId} />}
        {page === 'jobs' && <JobsPage userId={userId} />}
        {page === 'applications' && <ApplicationsPage userId={userId} />}
        {page === 'resume' && <ResumePage userId={userId} />}
        {page === 'profile' && <ProfilePage userId={userId} />}
        {page === 'templates' && <TemplatesPage userId={userId} />}
      </main>
    </div>
  );
}
