import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, FolderKanban, LayoutDashboard, Search, Users } from 'lucide-react';
import { api } from './api';
import Dashboard from './components/Dashboard';
import ProjectsPage from './components/ProjectsPage';
import KanbanPage from './components/KanbanPage';
import ProjectDetail from './components/ProjectDetail';
import type { DashboardData, Member, Project } from './types';

type Page = 'dashboard' | 'projects' | 'kanban' | 'detail';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardData, projectData, memberData] = await Promise.all([api.dashboard(), api.projects(), api.members()]);
      setDashboard(dashboardData);
      setProjects(projectData);
      setMembers(memberData);
      if (!selectedProjectId && projectData[0]) setSelectedProjectId(projectData[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const currentProject = useMemo(() => projects.find((project) => project.id === selectedProjectId), [projects, selectedProjectId]);

  const openProject = (id: number) => {
    setSelectedProjectId(id);
    setPage('detail');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">PF</div><div><strong>ProjectFlow</strong><span>Delivery OS</span></div></div>
        <nav>
          <button className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}><LayoutDashboard size={18}/>Dashboard</button>
          <button className={page === 'projects' ? 'active' : ''} onClick={() => setPage('projects')}><FolderKanban size={18}/>Projects</button>
          <button className={page === 'kanban' ? 'active' : ''} onClick={() => setPage('kanban')}><CalendarDays size={18}/>Kanban</button>
          <button className={page === 'detail' ? 'active' : ''} onClick={() => currentProject && setPage('detail')}><BarChart3 size={18}/>Reports</button>
        </nav>
        <div className="sidebar-card"><Users size={18}/><strong>{members.length} teammates</strong><span>Product, design, engineering, and QA aligned in one workspace.</span></div>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div><p className="eyebrow">Workspace</p><h1>{page === 'detail' && currentProject ? currentProject.name : 'Project Management Dashboard'}</h1></div>
          <label className="searchbox"><Search size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects, clients, tasks..." /></label>
        </header>
        {loading && <div className="state-card">Loading your project workspace...</div>}
        {error && <div className="state-card error"><strong>Backend connection issue</strong><span>{error}</span></div>}
        {!loading && !error && dashboard && page === 'dashboard' && <Dashboard data={dashboard} onOpenProject={openProject} />}
        {!loading && !error && page === 'projects' && <ProjectsPage projects={projects} members={members} search={search} onRefresh={load} onOpenProject={openProject} />}
        {!loading && !error && page === 'kanban' && <KanbanPage projects={projects} members={members} selectedProjectId={selectedProjectId} onSelectProject={setSelectedProjectId} />}
        {!loading && !error && page === 'detail' && selectedProjectId && <ProjectDetail projectId={selectedProjectId} members={members} onRefreshList={load} />}
      </main>
    </div>
  );
}
