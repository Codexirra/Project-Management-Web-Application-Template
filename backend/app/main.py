import os
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .db import execute, init_db, one

load_dotenv(override=False)

app = FastAPI(title='ProjectFlow API', version='1.0.0')

origins = [origin.strip() for origin in os.getenv('ALLOWED_ORIGINS', '').split(',') if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

Priority = Literal['Low', 'Medium', 'High', 'Critical']
ProjectStatus = Literal['Planning', 'Active', 'At Risk', 'Completed', 'Paused']
TaskStatus = Literal['Backlog', 'In Progress', 'Review', 'Done']
Health = Literal['On Track', 'At Risk', 'Blocked']


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2)
    client: str = Field(min_length=2)
    description: str = Field(min_length=5)
    status: ProjectStatus = 'Planning'
    priority: Priority = 'Medium'
    start_date: str
    due_date: str
    budget: float = 0
    progress: int = Field(default=0, ge=0, le=100)
    owner_id: int | None = None


class TaskCreate(BaseModel):
    project_id: int
    title: str = Field(min_length=2)
    description: str = ''
    status: TaskStatus = 'Backlog'
    priority: Priority = 'Medium'
    assignee_id: int | None = None
    due_date: str
    estimate_hours: int = Field(default=4, ge=1, le=200)


class TaskUpdate(BaseModel):
    status: TaskStatus | None = None
    priority: Priority | None = None
    assignee_id: int | None = None
    title: str | None = None
    description: str | None = None
    due_date: str | None = None
    estimate_hours: int | None = None


class CommentCreate(BaseModel):
    author_id: int | None = None
    body: str = Field(min_length=2)


class FileCreate(BaseModel):
    name: str = Field(min_length=2)
    file_type: str = Field(min_length=2)
    url: str = '#'
    uploaded_by: int | None = None


class ReportCreate(BaseModel):
    title: str = Field(min_length=2)
    summary: str = Field(min_length=5)
    health: Health = 'On Track'
    progress: int = Field(ge=0, le=100)


@app.on_event('startup')
def startup() -> None:
    init_db()


@app.get('/api/health')
def health() -> dict[str, str]:
    return {'status': 'ok'}


def project_select(where: str = '', params: list[Any] | None = None) -> list[dict[str, Any]]:
    return execute(
        f'''
        SELECT p.*, m.name AS owner_name,
        COALESCE(task_stats.task_count,0) AS task_count,
        COALESCE(task_stats.completed_tasks,0) AS completed_tasks
        FROM projects p
        LEFT JOIN members m ON m.id = p.owner_id
        LEFT JOIN (
          SELECT project_id, COUNT(*) AS task_count, COUNT(*) FILTER (WHERE status='Done') AS completed_tasks
          FROM tasks GROUP BY project_id
        ) task_stats ON task_stats.project_id = p.id
        {where}
        ORDER BY p.due_date ASC
        ''',
        params or [],
    )


@app.get('/api/dashboard')
def dashboard() -> dict[str, Any]:
    projects = project_select()
    tasks = execute('SELECT * FROM tasks ORDER BY due_date ASC')
    reports = execute('''SELECT r.*, p.name AS project_name FROM progress_reports r JOIN projects p ON p.id=r.project_id ORDER BY r.created_at DESC LIMIT 5''')
    active = [p for p in projects if p['status'] in ('Active', 'At Risk')]
    at_risk = [p for p in projects if p['status'] == 'At Risk' or p['priority'] == 'Critical']
    completed_tasks = [t for t in tasks if t['status'] == 'Done']
    avg_progress = round(sum(int(p['progress']) for p in projects) / max(len(projects), 1))
    upcoming = execute('''
      SELECT 'task' AS item_type, title, due_date, priority, project_id FROM tasks WHERE status <> 'Done'
      UNION ALL
      SELECT 'milestone' AS item_type, title, due_date, 'High' AS priority, project_id FROM milestones WHERE completed=false
      ORDER BY due_date ASC LIMIT 8
    ''')
    return {
        'metrics': {
            'totalProjects': len(projects),
            'activeProjects': len(active),
            'atRiskProjects': len(at_risk),
            'openTasks': len([t for t in tasks if t['status'] != 'Done']),
            'completedTasks': len(completed_tasks),
            'averageProgress': avg_progress,
            'totalBudget': float(sum(float(p['budget']) for p in projects)),
        },
        'projects': projects[:6],
        'upcoming': upcoming,
        'reports': reports,
    }


@app.get('/api/members')
def members() -> list[dict[str, Any]]:
    return execute('SELECT * FROM members ORDER BY name')


@app.get('/api/projects')
def list_projects(search: str = '', status: str = '', priority: str = '') -> list[dict[str, Any]]:
    clauses: list[str] = []
    params: list[Any] = []
    if search:
        clauses.append('(LOWER(p.name) LIKE LOWER(%s) OR LOWER(p.client) LIKE LOWER(%s) OR LOWER(p.description) LIKE LOWER(%s))')
        params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])
    if status:
        clauses.append('p.status = %s')
        params.append(status)
    if priority:
        clauses.append('p.priority = %s')
        params.append(priority)
    where = 'WHERE ' + ' AND '.join(clauses) if clauses else ''
    return project_select(where, params)


@app.post('/api/projects')
def create_project(payload: ProjectCreate) -> dict[str, Any]:
    row = one(
        '''INSERT INTO projects (name,client,description,status,priority,start_date,due_date,budget,progress,owner_id)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *''',
        [payload.name, payload.client, payload.description, payload.status, payload.priority, payload.start_date, payload.due_date, payload.budget, payload.progress, payload.owner_id],
    )
    return row or {}


@app.get('/api/projects/{project_id}')
def project_detail(project_id: int) -> dict[str, Any]:
    project = one('''SELECT p.*, m.name AS owner_name FROM projects p LEFT JOIN members m ON m.id=p.owner_id WHERE p.id=%s''', [project_id])
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    project['members'] = execute('''SELECT m.* FROM members m JOIN project_members pm ON pm.member_id=m.id WHERE pm.project_id=%s ORDER BY m.name''', [project_id])
    project['tasks'] = execute('''SELECT t.*, m.name AS assignee_name FROM tasks t LEFT JOIN members m ON m.id=t.assignee_id WHERE t.project_id=%s ORDER BY t.due_date''', [project_id])
    project['milestones'] = execute('SELECT * FROM milestones WHERE project_id=%s ORDER BY due_date', [project_id])
    project['comments'] = execute('''SELECT c.*, m.name AS author_name, m.avatar_color FROM comments c LEFT JOIN members m ON m.id=c.author_id WHERE c.project_id=%s ORDER BY c.created_at DESC''', [project_id])
    project['files'] = execute('''SELECT f.*, m.name AS uploaded_by_name FROM files f LEFT JOIN members m ON m.id=f.uploaded_by WHERE f.project_id=%s ORDER BY f.created_at DESC''', [project_id])
    project['reports'] = execute('SELECT * FROM progress_reports WHERE project_id=%s ORDER BY created_at DESC', [project_id])
    return project


@app.get('/api/tasks')
def list_tasks(project_id: int | None = Query(default=None)) -> list[dict[str, Any]]:
    if project_id:
        return execute('''SELECT t.*, p.name AS project_name, m.name AS assignee_name FROM tasks t JOIN projects p ON p.id=t.project_id LEFT JOIN members m ON m.id=t.assignee_id WHERE t.project_id=%s ORDER BY t.due_date''', [project_id])
    return execute('''SELECT t.*, p.name AS project_name, m.name AS assignee_name FROM tasks t JOIN projects p ON p.id=t.project_id LEFT JOIN members m ON m.id=t.assignee_id ORDER BY t.due_date''')


@app.post('/api/tasks')
def create_task(payload: TaskCreate) -> dict[str, Any]:
    row = one('''INSERT INTO tasks (project_id,title,description,status,priority,assignee_id,due_date,estimate_hours)
      VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *''',
      [payload.project_id, payload.title, payload.description, payload.status, payload.priority, payload.assignee_id, payload.due_date, payload.estimate_hours])
    return row or {}


@app.patch('/api/tasks/{task_id}')
def update_task(task_id: int, payload: TaskUpdate) -> dict[str, Any]:
    current = one('SELECT * FROM tasks WHERE id=%s', [task_id])
    if not current:
        raise HTTPException(status_code=404, detail='Task not found')
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return current
    fields = ', '.join(f'{key}=%s' for key in data)
    row = one(f'UPDATE tasks SET {fields} WHERE id=%s RETURNING *', [*data.values(), task_id])
    return row or {}


@app.post('/api/projects/{project_id}/comments')
def add_comment(project_id: int, payload: CommentCreate) -> dict[str, Any]:
    row = one('''INSERT INTO comments (project_id,author_id,body) VALUES (%s,%s,%s) RETURNING *''', [project_id, payload.author_id, payload.body])
    return row or {}


@app.post('/api/projects/{project_id}/files')
def add_file(project_id: int, payload: FileCreate) -> dict[str, Any]:
    row = one('''INSERT INTO files (project_id,name,file_type,url,uploaded_by) VALUES (%s,%s,%s,%s,%s) RETURNING *''', [project_id, payload.name, payload.file_type, payload.url, payload.uploaded_by])
    return row or {}


@app.post('/api/projects/{project_id}/reports')
def add_report(project_id: int, payload: ReportCreate) -> dict[str, Any]:
    row = one('''INSERT INTO progress_reports (project_id,title,summary,health,progress) VALUES (%s,%s,%s,%s,%s) RETURNING *''', [project_id, payload.title, payload.summary, payload.health, payload.progress])
    execute('UPDATE projects SET progress=%s, status=CASE WHEN %s=%s THEN %s ELSE status END WHERE id=%s', [payload.progress, payload.health, 'At Risk', 'At Risk', project_id])
    return row or {}
