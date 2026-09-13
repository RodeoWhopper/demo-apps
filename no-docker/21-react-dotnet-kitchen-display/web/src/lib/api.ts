import type { Problem } from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly problem: Problem | undefined;

  constructor(status: number, problem?: Problem) {
    super(problem?.detail ?? problem?.title ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }

  /** Flattened validation messages for 400 responses, otherwise the detail text. */
  get messages(): string[] {
    const errors = this.problem?.errors;
    if (errors) return Object.values(errors).flat();
    return [this.message];
  }
}

export interface RequestOptions {
  method?: string;
  json?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.messages.join(" ");
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

/** Minimal fetch wrapper: JSON in/out, cookies included, problem documents turned into ApiError. */
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.json !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  const res = await fetch(path, {
    method: opts.method ?? (opts.json !== undefined ? "POST" : "GET"),
    headers,
    body: opts.json !== undefined ? JSON.stringify(opts.json) : undefined,
    // The refresh cookie is same-origin in production and proxied by Vite in development.
    credentials: "include",
    signal: opts.signal,
  });

  if (!res.ok) {
    let problem: Problem | undefined;
    try {
      problem = (await res.json()) as Problem;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, problem);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
