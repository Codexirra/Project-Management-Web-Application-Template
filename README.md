# Project Management Web Application

A complete project management web application built with **Codexirra**, using a React, Vite, TypeScript frontend, a FastAPI backend, and Postgres database.

This template was generated with [Codexirra](https://codexirra.com), an AI development workspace for building real web applications. Codexirra helps you generate, edit, preview, debug, and refine full-stack web apps from simple prompts.

> Want to build your own CRM, dashboard, portal, or SaaS app?  
> Try Codexirra: [https://codexirra.com](https://codexirra.com)

---

## Built with Codexirra

This project is an example of what can be created using Codexirra.

Codexirra can help generate complete web applications with:

- Frontend pages and components
- Backend API routes
- Database-aware app logic
- Clean SaaS-style UI layouts
- Forms, tables, dashboards, filters, and detail pages
- Full project structure
- Editable code and live preview

This project management web application is designed as a practical SaaS-style template for managing projects, tasks, teams, deadlines, milestones, comments, files, priorities, and progress reports.

---

## What this app does

This is a complete project management SaaS dashboard for managing projects, tasks, teams, deadlines, milestones, comments, files, priorities, and progress reports.

It uses a modern sidebar dashboard layout with portfolio metrics, deadline views, searchable project tables, project creation forms, Kanban task boards, and detailed project workspaces.

---

## Tech stack

- React
- Vite
- TypeScript
- Python
- FastAPI
- Postgres

---

## Features

- Sidebar SaaS dashboard layout
- Portfolio dashboard cards and deadline views
- Searchable and filterable project table
- Project creation form
- Kanban board with task status movement
- Task quick-add workflow
- Project detail pages with progress, team, milestones, tasks, comments, files, and reports
- FastAPI REST API under `/api/...`
- Postgres schema creation
- Realistic seed data on backend startup


## Run frontend

```bash
npm install
npm run dev
```

The frontend API helper reads `VITE_API_URL` or `VITE_API_BASE_URL` and normalizes the result so calls end under `/api`. If no variable is configured, it uses same-origin `/api`.

For optional local development proxying, set `VITE_API_PROXY_TARGET` before running Vite. No localhost proxy is enabled by default.

## Run backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="postgresql://user:password@host:5432/projectflow"
uvicorn app.main:app --reload
```

The backend exports `app` from `/backend/app/main.py` and keeps all app routes under `/api`.
