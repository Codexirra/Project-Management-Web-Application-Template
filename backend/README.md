# ProjectFlow Backend

FastAPI backend for the ProjectFlow project management application.

## Environment

Create a database and provide a Postgres connection string:

```bash
export DATABASE_URL="postgresql://user:password@host:5432/projectflow"
```

Optional CORS origins can be configured with:

```bash
export ALLOWED_ORIGINS="https://your-frontend.example"
```

## Install and run

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Do not run the app module directly. Codexirra and production runners should start it with Uvicorn and the exported `app` object.

## API overview

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/members`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/{project_id}`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/{task_id}`
- `POST /api/projects/{project_id}/comments`
- `POST /api/projects/{project_id}/files`
- `POST /api/projects/{project_id}/reports`

On startup the backend creates the required Postgres tables if they do not exist and seeds a realistic workspace when the database is empty.
