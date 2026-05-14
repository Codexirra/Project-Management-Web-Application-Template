import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import type { Member, Priority, Project, Task, TaskStatus } from '../types';

interface Props { projects: Project[]; members: Member[]; selectedProjectId: number | null; onSelectProject: (id: number) => void; }
const columns: TaskStatus[] = ['Backlog', 'In Progress', 'Review', 'Done'];
const priorities: Priority[] = ['Low', 'Medium', 'High', 'Critical'];

export default function KanbanPage({ projects, members, selectedProjectId, onSelectProject }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', due_date: '', priority: 'Medium' as Priority, assignee_id: '' });

  const loadTasks = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    setTasks(await api.tasks(selectedProjectId));
    setLoading(false);
  };
  useEffect(() => { loadTasks(); }, [selectedProjectId]);

  const move = async (task: Task, status: TaskStatus) => {
    setTasks(tasks.map(item => item.id === task.id ? { ...item, status } : item));
    await api.updateTaskStatus(task.id, status);
    loadTasks();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedProjectId || !form.title || !form.due_date) return;
    await api.createTask({ project_id: selectedProjectId, title: form.title, description: 'Created from Kanban quick add.', due_date: form.due_date, priority: form.priority, status: 'Backlog', assignee_id: form.assignee_id ? Number(form.assignee_id) : undefined, estimate_hours: 4 });
    setForm({ title: '', due_date: '', priority: 'Medium', assignee_id: '' });
    loadTasks();
  };

  return <div className="page-stack">
    <section className="panel filters"><div><h2>Kanban board</h2><p>Move cards through delivery stages and add task commitments.</p></div><select value={selectedProjectId || ''} onChange={e => onSelectProject(Number(e.target.value))}>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></section>
    <form className="quick-task" onSubmit={submit}><input placeholder="New task title" value={form.title} onChange={e => setForm({...form, title: e.target.value})}/><input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})}/><select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as Priority})}>{priorities.map(p => <option key={p}>{p}</option>)}</select><select value={form.assignee_id} onChange={e => setForm({...form, assignee_id: e.target.value})}><option value="">Assignee</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select><button>Add task</button></form>
    {loading && <div className="state-card">Loading board...</div>}
    <section className="kanban">{columns.map(column => <div className="kanban-column" key={column}><h3>{column}<span>{tasks.filter(t => t.status === column).length}</span></h3>{tasks.filter(task => task.status === column).map(task => <article className="task-card" key={task.id}><div className="task-top"><span className={`chip ${task.priority.toLowerCase()}`}>{task.priority}</span><time>{new Date(task.due_date).toLocaleDateString()}</time></div><strong>{task.title}</strong><p>{task.description}</p><small>{task.assignee_name || 'Unassigned'} · {task.estimate_hours}h</small><div className="move-row">{columns.filter(c => c !== column).map(c => <button key={c} onClick={() => move(task, c)}>{c}</button>)}</div></article>)}</div>)}</section>
  </div>;
}
