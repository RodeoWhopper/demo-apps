export type Role = "admin" | "member";
export type Status = "todo" | "in_progress" | "done";
export type Priority = "low" | "medium" | "high";

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  assigned_open_tasks?: number;
}

export interface Project {
  id: number;
  key: string;
  name: string;
  description: string;
  color: string;
  task_counts: Record<string, number>;
}

export interface Task {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assignee_id: number | null;
  assignee: { id: number; name: string; email: string } | null;
  created_by_id: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail extends Project {
  tasks: Task[];
}

export const STATUSES: Status[] = ["todo", "in_progress", "done"];
export const STATUS_LABEL: Record<Status, string> = { todo: "To do", in_progress: "In progress", done: "Done" };
export const NEXT_STATUS: Record<Status, Status> = { todo: "in_progress", in_progress: "done", done: "todo" };
