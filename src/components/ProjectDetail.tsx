import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import type { Health, Member, ProjectDetail as ProjectDetailType } from '../types';

interface Props { projectId: number; members: Member[]; onRefreshList: () => void; }

export default function ProjectDetail({ projectId, members, onRefreshList }: Props) {
  const [project, setProject] = useState<ProjectDetailType | null>(null);
  const [comment, setComment] = useState('');
  const [file, setFile] = useState({ name: '', file_type: 'Document', url: '#' });
  const [report, setReport] = useState({ title: '', summary: '', health: 'On Track' as Health, progress: 50 });

  const load = async () => setProject(await api.project(projectId));
  useEffect(() => { load(); }, [projectId]);
  if (!project) return <div className="state-card">Loading project details...</div>;

  const addComment = async (event: FormEvent) => { event.preventDefault(); if (!comment) return; await api.addComment(project.id, comment, members[0]?.id); setComment(''); load(); };
  const addFile = async (event: FormEvent) => { event.preventDefault(); if (!file.name) return; await api.addFile(project.id, { ...file, uploaded_by: members[0]?.id }); setFile({ name: '', file_type: 'Document', url: '#' }); load(); };
  const addReport = async (event: FormEvent) => { event.preventDefault(); if (!report.title || !report.summary) return; await api.addReport(project.id, report); onRefreshList(); load(); };

  return <div className="page-stack">
    <section className="hero panel"><div><span className={`chip ${project.priority.toLowerCase()}`}>{project.priority}</span><h2>{project.name}</h2><p>{project.description}</p><div className="meta-row"><span>{project.client}</span><span>{project.status}</span><span>Due {new Date(project.due_date).toLocaleDateString()}</span><span>Owner: {project.owner_name}</span></div></div><div className="hero-progress"><strong>{project.progress}%</strong><div className="progress"><span style={{width: `${project.progress}%`}}/></div><small>Overall delivery progress</small></div></section>
    <section className="detail-grid"><div className="panel"><h2>Milestones</h2>{project.milestones.map(m => <div className="deadline" key={m.id}><div><strong>{m.title}</strong><span>{m.completed ? 'Completed' : 'Open'}</span></div><time>{new Date(m.due_date).toLocaleDateString()}</time></div>)}</div><div className="panel"><h2>Team</h2><div className="team-list">{project.members.map(member => <div className="member" key={member.id}><span style={{background: member.avatar_color}}>{member.name.slice(0,1)}</span><div><strong>{member.name}</strong><small>{member.role}</small></div></div>)}</div></div></section>
    <section className="panel"><div className="panel-heading"><h2>Tasks</h2><span>{project.tasks.length} delivery items</span></div><table><thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Due</th></tr></thead><tbody>{project.tasks.map(task => <tr key={task.id}><td><strong>{task.title}</strong><span>{task.description}</span></td><td><span className="chip">{task.status}</span></td><td><span className={`chip ${task.priority.toLowerCase()}`}>{task.priority}</span></td><td>{task.assignee_name || 'Unassigned'}</td><td>{new Date(task.due_date).toLocaleDateString()}</td></tr>)}</tbody></table></section>
    <section className="detail-grid"><div className="panel"><h2>Comments</h2><form className="inline-form" onSubmit={addComment}><input placeholder="Share an update or blocker..." value={comment} onChange={e => setComment(e.target.value)}/><button>Post</button></form>{project.comments.map(c => <article className="comment" key={c.id}><strong>{c.author_name || 'Team member'}</strong><p>{c.body}</p><small>{new Date(c.created_at).toLocaleString()}</small></article>)}</div><div className="panel"><h2>Files</h2><form className="inline-form" onSubmit={addFile}><input placeholder="File name" value={file.name} onChange={e => setFile({...file, name: e.target.value})}/><input placeholder="Type" value={file.file_type} onChange={e => setFile({...file, file_type: e.target.value})}/><button>Add</button></form>{project.files.map(f => <div className="deadline" key={f.id}><div><strong>{f.name}</strong><span>{f.file_type} · {f.uploaded_by_name}</span></div><a href={f.url}>Open</a></div>)}</div></section>
    <section className="panel"><div className="panel-heading"><h2>Progress reports</h2><span>Status narratives for stakeholders</span></div><form className="form-grid" onSubmit={addReport}><input placeholder="Report title" value={report.title} onChange={e => setReport({...report, title: e.target.value})}/><select value={report.health} onChange={e => setReport({...report, health: e.target.value as Health})}><option>On Track</option><option>At Risk</option><option>Blocked</option></select><input type="number" min="0" max="100" value={report.progress} onChange={e => setReport({...report, progress: Number(e.target.value)})}/><textarea placeholder="Executive summary" value={report.summary} onChange={e => setReport({...report, summary: e.target.value})}/><button>Add report</button></form><div className="reports-grid">{project.reports.map(r => <article className="report-card" key={r.id}><span className="chip">{r.health}</span><h3>{r.title}</h3><p>{r.summary}</p><small>{r.progress}% · {new Date(r.created_at).toLocaleDateString()}</small></article>)}</div></section>
  </div>;
}
