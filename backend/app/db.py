import os
from contextlib import contextmanager
from typing import Any, Iterable

import psycopg
from psycopg.rows import dict_row


def database_url() -> str:
    url = os.getenv('DATABASE_URL')
    if not url:
        raise RuntimeError('DATABASE_URL is required for ProjectFlow persistence')
    return url


@contextmanager
def get_conn():
    with psycopg.connect(database_url(), row_factory=dict_row) as conn:
        yield conn


def execute(query: str, params: Iterable[Any] | None = None) -> list[dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params or [])
            if cur.description:
                return list(cur.fetchall())
            return []


def one(query: str, params: Iterable[Any] | None = None) -> dict[str, Any] | None:
    rows = execute(query, params)
    return rows[0] if rows else None


def init_db() -> None:
    schema = '''
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      avatar_color TEXT NOT NULL DEFAULT '#2563eb'
    );

    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      client TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Planning',
      priority TEXT NOT NULL DEFAULT 'Medium',
      start_date DATE NOT NULL,
      due_date DATE NOT NULL,
      budget NUMERIC(12,2) NOT NULL DEFAULT 0,
      progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
      owner_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS project_members (
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
      PRIMARY KEY (project_id, member_id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Backlog',
      priority TEXT NOT NULL DEFAULT 'Medium',
      assignee_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
      due_date DATE NOT NULL,
      estimate_hours INTEGER NOT NULL DEFAULT 4,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      due_date DATE NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      author_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS files (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      url TEXT NOT NULL,
      uploaded_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS progress_reports (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      health TEXT NOT NULL DEFAULT 'On Track',
      progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    '''
    with get_conn() as conn:
        conn.execute(schema)
        conn.commit()
    seed_db()


def seed_db() -> None:
    existing = one('SELECT COUNT(*) AS count FROM projects')
    if existing and existing['count'] > 0:
        return

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                '''INSERT INTO members (name, role, email, avatar_color) VALUES
                ('Avery Johnson','Product Lead','avery@projectflow.test','#2563eb'),
                ('Mina Patel','Engineering Manager','mina@projectflow.test','#7c3aed'),
                ('Leo Brooks','UX Designer','leo@projectflow.test','#db2777'),
                ('Sam Rivera','QA Lead','sam@projectflow.test','#059669'),
                ('Nora Chen','Frontend Engineer','nora@projectflow.test','#ea580c')
                RETURNING id'''
            )
            member_ids = [row['id'] for row in cur.fetchall()]
            cur.execute(
                '''INSERT INTO projects (name, client, description, status, priority, start_date, due_date, budget, progress, owner_id) VALUES
                ('Atlas CRM Redesign','Northstar Sales','Redesign customer workspace, analytics widgets, and pipeline automation for enterprise sales teams.','Active','High','2025-01-06','2025-04-18',145000,68,%s),
                ('Mobile Banking Launch','Evergreen Credit Union','Ship a secure mobile banking experience with account insights, transfer flows, and biometric sign-in.','At Risk','Critical','2025-02-03','2025-05-30',220000,42,%s),
                ('Data Warehouse Migration','Acme Logistics','Move reporting workloads to a modern warehouse with validated dashboards and governance workflows.','Planning','Medium','2025-03-01','2025-07-15',185000,18,%s),
                ('Customer Portal Optimization','BrightCare Health','Improve portal performance, support ticket visibility, and appointment self-service conversion.','Active','High','2025-01-20','2025-03-28',98000,81,%s)
                RETURNING id''',
                (member_ids[0], member_ids[1], member_ids[1], member_ids[0]),
            )
            project_ids = [row['id'] for row in cur.fetchall()]
            for project_id in project_ids:
                for member_id in member_ids:
                    cur.execute('INSERT INTO project_members (project_id, member_id) VALUES (%s,%s) ON CONFLICT DO NOTHING', (project_id, member_id))

            task_rows = [
                (project_ids[0], 'Map current CRM navigation pain points', 'Interview account executives and customer success leaders.', 'Done', 'High', member_ids[2], '2025-01-22', 10),
                (project_ids[0], 'Build dashboard card library', 'Reusable cards for pipeline, revenue, and activity signals.', 'In Progress', 'High', member_ids[4], '2025-03-05', 18),
                (project_ids[0], 'QA automation for saved views', 'Regression coverage for filters and shared views.', 'Review', 'Medium', member_ids[3], '2025-03-13', 12),
                (project_ids[1], 'Finalize biometric sign-in threat model', 'Review authentication flows with security stakeholders.', 'In Progress', 'Critical', member_ids[1], '2025-03-01', 14),
                (project_ids[1], 'Implement transfer confirmation screen', 'Accessible confirmation and receipt download experience.', 'Backlog', 'High', member_ids[4], '2025-03-20', 16),
                (project_ids[2], 'Inventory legacy reporting jobs', 'Classify dashboards by owner, SLA, and migration complexity.', 'Backlog', 'Medium', member_ids[0], '2025-03-18', 20),
                (project_ids[3], 'Optimize appointment booking query', 'Reduce p95 latency under high traffic.', 'Done', 'High', member_ids[1], '2025-02-18', 8),
                (project_ids[3], 'Design ticket timeline component', 'Show support events and SLA state in portal.', 'In Progress', 'Medium', member_ids[2], '2025-03-02', 12)
            ]
            cur.executemany('''INSERT INTO tasks (project_id,title,description,status,priority,assignee_id,due_date,estimate_hours) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)''', task_rows)

            for project_id in project_ids:
                cur.execute('''INSERT INTO milestones (project_id,title,due_date,completed) VALUES
                    (%s,'Discovery complete','2025-02-14',true),
                    (%s,'Stakeholder review','2025-03-21',false),
                    (%s,'Production launch','2025-05-15',false)''', (project_id, project_id, project_id))
                cur.execute('''INSERT INTO comments (project_id,author_id,body) VALUES
                    (%s,%s,'Weekly sync notes are updated. Please review risks before Friday steering meeting.'),
                    (%s,%s,'Design and engineering dependencies are now visible on the Kanban board.')''', (project_id, member_ids[0], project_id, member_ids[2]))
                cur.execute('''INSERT INTO files (project_id,name,file_type,url,uploaded_by) VALUES
                    (%s,'Project brief.pdf','PDF','#',%s),
                    (%s,'Delivery plan.xlsx','Spreadsheet','#',%s)''', (project_id, member_ids[0], project_id, member_ids[1]))
                cur.execute('''INSERT INTO progress_reports (project_id,title,summary,health,progress) VALUES
                    (%s,'Weekly delivery report','Team velocity is stable. Main focus is closing high-priority review items and dependency risks.','On Track',(SELECT progress FROM projects WHERE id=%s))''', (project_id, project_id))
        conn.commit()
