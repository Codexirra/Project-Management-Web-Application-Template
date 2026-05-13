import type { DashboardData, Member, Project, ProjectDetail, Task, TaskStatus } from './types';

const normalizeApiBase = (value?: string) => { const base = (value || '/api').replace(/\/+$/, ''); return base.endsWith('/api') ? base : `${base}/api`; };
export const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.json();
}

export const api = {
  dashboard: () => request<DashboardData>('/dashboard'),
  members: () => request<Member[]>('/members'),
  projects: (params: { search?: string; status?: string; priority?: string } = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, v]) => Boolean(v)) as [string, string][]).toString();
    return request<Project[]>(`/projects${query ? `?${query}` : ''}`);
  },
  createProject: (payload: Partial<Project>) => request<Project>('/projects', { method: 'POST', body: JSON.stringify(payload) }),
  project: (id: number) => request<ProjectDetail>(`/projects/${id}`),
  tasks: (projectId?: number) => request<Task[]>(`/tasks${projectId ? `?project_id=${projectId}` : ''}`),
  createTask: (payload: Partial<Task>) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  updateTaskStatus: (id: number, status: TaskStatus) => request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  addComment: (projectId: number, body: string, author_id?: number) => request(`/projects/${projectId}/comments`, { method: 'POST', body: JSON.stringify({ body, author_id }) }),
  addFile: (projectId: number, payload: { name: string; file_type: string; url: string; uploaded_by?: number }) => request(`/projects/${projectId}/files`, { method: 'POST', body: JSON.stringify(payload) }),
  addReport: (projectId: number, payload: { title: string; summary: string; health: string; progress: number }) => request(`/projects/${projectId}/reports`, { method: 'POST', body: JSON.stringify(payload) }),
};
