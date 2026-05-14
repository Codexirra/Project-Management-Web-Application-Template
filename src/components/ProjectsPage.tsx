import { FormEvent, useMemo, useState } from 'react';
import { api } from '../api';
import type { Member, Priority, Project, ProjectStatus } from '../types';

interface Props { projects: Project[]; members: Member[]; search: string; onRefresh: () => void; onOpenProject: (id: number) => void; }

const statuses: ProjectStatus[] = ['Planning', 'Active', 'At Risk', 'Completed', 'Paused'];
const priorities: Priority[] = ['Low', 'Medium', 'High', 'Critical'];

export default function ProjectsPage({ projects, members, search, onRefresh, onOpenProject }: Props) {
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [form, setForm] = useState({ name: '', client: '', description: '', due_date: '', priority: 'Medium' as Priority, owner_id: '' });
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => projects.filter(project => {
    const term = search.toLowerCase();
    return (!term || [project.name, project.client, project.description].join(' ').toLowerCase().includes(term)) && (!status || project.status === status) && (!priority || project.priority === priority);
  }), [projects, search, status, priority]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name || !form.client || !form.description || !form.due_date) return;
    setSaving(true);
    await api.createProject({ ...form, status: 'Planning', start_date: new Date().toISOString().slice(0, 10), progress: 0, budget: 50000, owner_id: form.owner_id ? Number(form.owner_id) : undefined });
    setForm({ name: '', client: '', description: '', due_date: '', priority: 'Medium', owner_id: '' });
    setSaving(false);
    onRefresh();
  };

  return <div className="page-stack">
    <section className="panel filters"><div><h2>Projects</h2><p>Filter delivery work by status, priority, client, or project name.</p></div><select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{statuses.map(s => <option key={s}>{s}</option>)}</select><select value={priority} onChange={e => setPriority(e.target.value)}><option value="">All priorities</option>{priorities.map(p => <option key={p}>{p}</option>)}</select></section>
    <section className="panel"><table><thead><tr><th>Project</th><th>Status</th><th>Priority</th><th>Owner</th><th>Deadline</th><th>Progress</th></tr></thead><tbody>{filtered.map(project => <tr key={project.id} onClick={() => onOpenProject(project.id)}><td><strong>{project.name}</strong><span>{project.client}</span></td><td><span className="chip">{project.status}</span></td><td><span className={`chip ${project.priority.toLowerCase()}`}>{project.priority}</span></td><td>{project.owner_name || 'Unassigned'}</td><td>{new Date(project.due_date).toLocaleDateString()}</td><td><div className="progress"><span style={{ width: `${project.progress}%` }} /></div>{project.progress}%</td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty">No projects match your filters.</div>}</section>
    <section className="panel"><div className="panel-heading"><h2>Create project</h2><span>Start a new delivery workspace</span></div><form className="form-grid" onSubmit={submit}><input placeholder="Project name" value={form.name} onChange={e => setForm({...form, name: e.target.value})}/><input placeholder="Client" value={form.client} onChange={e => setForm({...form, client: e.target.value})}/><input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})}/><select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as Priority})}>{priorities.map(p => <option key={p}>{p}</option>)}</select><select value={form.owner_id} onChange={e => setForm({...form, owner_id: e.target.value})}><option value="">Owner</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select><textarea placeholder="Project description" value={form.description} onChange={e => setForm({...form, description: e.target.value})}/><button disabled={saving}>{saving ? 'Creating...' : 'Create project'}</button></form></section>
  </div>;
}
