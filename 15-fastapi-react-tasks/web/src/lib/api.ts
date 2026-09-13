// Small fetch wrapper. VITE_API_URL is baked in at build time:
//   http://localhost:8015 for local dev, "/api" when nginx proxies to the API container.
export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8015").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) return data.detail.map((d: { msg: string }) => d.msg).join(", ");
  } catch {
    /* non-JSON body */
  }
  return res.statusText || `HTTP ${res.status}`;
}

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// OAuth2 password flow: the token endpoint expects application/x-www-form-urlencoded.
export async function requestToken(username: string, password: string) {
  const form = new URLSearchParams({ grant_type: "password", username, password });
  const res = await fetch(`${API_URL}/auth/token`, { method: "POST", body: form });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  return (await res.json()) as { access_token: string; token_type: string; expires_in: number };
}
