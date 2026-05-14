import { AlertTriangle, CheckCircle2, Clock, DollarSign, FolderOpen, TrendingUp } from 'lucide-react';
import type { DashboardData } from '../types';

interface Props { data: DashboardData; onOpenProject: (id: number) => void; }

const money = (value: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export default function Dashboard({ data, onOpenProject }: Props) {
  const cards = [
    ['Total projects', data.metrics.totalProjects, <FolderOpen size={20}/>],
    ['Active projects', data.metrics.activeProjects, <TrendingUp size={20}/>],
    ['At-risk items', data.metrics.atRiskProjects, <AlertTriangle size={20}/>],
    ['Open tasks', data.metrics.openTasks, <Clock size={20}/>],
    ['Completed tasks', data.metrics.completedTasks, <CheckCircle2 size={20}/>],
    ['Portfolio budget', money(data.metrics.totalBudget), <DollarSign size={20}/>],
  ];
  return <div className="page-stack">
    <section className="metrics-grid">{cards.map(([label, value, icon]) => <article className="metric-card" key={String(label)}><div>{icon}</div><span>{label}</span><strong>{value}</strong></article>)}</section>
    <section className="two-column">
      <div className="panel"><div className="panel-heading"><h2>Priority portfolio</h2><span>{data.metrics.averageProgress}% average progress</span></div><div className="project-list">{data.projects.map(project => <button key={project.id} onClick={() => onOpenProject(project.id)} className="project-row"><div><strong>{project.name}</strong><span>{project.client}</span></div><div className="progress"><span style={{width: `${project.progress}%`}} /></div><em className={`chip ${project.priority.toLowerCase()}`}>{project.priority}</em></button>)}</div></div>
      <div className="panel"><div className="panel-heading"><h2>Upcoming deadlines</h2><span>Tasks & milestones</span></div>{data.upcoming.map((item, index) => <div className="deadline" key={`${item.title}-${index}`}><div><strong>{item.title}</strong><span>{item.item_type}</span></div><time>{new Date(item.due_date).toLocaleDateString()}</time></div>)}</div>
    </section>
    <section className="panel"><div className="panel-heading"><h2>Latest progress reports</h2><span>Executive delivery view</span></div><div className="reports-grid">{data.reports.map(report => <article className="report-card" key={report.id}><span className={`chip ${report.health === 'At Risk' ? 'critical' : 'low'}`}>{report.health}</span><h3>{report.title}</h3><p>{report.summary}</p><div className="progress"><span style={{width: `${report.progress}%`}} /></div><small>{report.project_name} · {report.progress}%</small></article>)}</div></section>
  </div>;
}
