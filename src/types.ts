export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type ProjectStatus = 'Planning' | 'Active' | 'At Risk' | 'Completed' | 'Paused';
export type TaskStatus = 'Backlog' | 'In Progress' | 'Review' | 'Done';
export type Health = 'On Track' | 'At Risk' | 'Blocked';

export interface Member { id: number; name: string; role: string; email: string; avatar_color: string; }
export interface Project { id: number; name: string; client: string; description: string; status: ProjectStatus; priority: Priority; start_date: string; due_date: string; budget: number; progress: number; owner_id?: number; owner_name?: string; task_count?: number; completed_tasks?: number; }
export interface Task { id: number; project_id: number; project_name?: string; title: string; description: string; status: TaskStatus; priority: Priority; assignee_id?: number; assignee_name?: string; due_date: string; estimate_hours: number; }
export interface Milestone { id: number; project_id: number; title: string; due_date: string; completed: boolean; }
export interface Comment { id: number; project_id: number; author_id?: number; author_name?: string; avatar_color?: string; body: string; created_at: string; }
export interface ProjectFile { id: number; project_id: number; name: string; file_type: string; url: string; uploaded_by?: number; uploaded_by_name?: string; created_at: string; }
export interface ProgressReport { id: number; project_id: number; project_name?: string; title: string; summary: string; health: Health; progress: number; created_at: string; }
export interface ProjectDetail extends Project { members: Member[]; tasks: Task[]; milestones: Milestone[]; comments: Comment[]; files: ProjectFile[]; reports: ProgressReport[]; }
export interface DashboardData { metrics: { totalProjects: number; activeProjects: number; atRiskProjects: number; openTasks: number; completedTasks: number; averageProgress: number; totalBudget: number; }; projects: Project[]; upcoming: Array<{ item_type: string; title: string; due_date: string; priority: Priority; project_id: number }>; reports: ProgressReport[]; }
