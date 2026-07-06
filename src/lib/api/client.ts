import { getAccessToken, clearAuthSession } from '../../features/auth/auth-store';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string;
};

function serializeBody(body: unknown): string | undefined {
  if (body === undefined) {
    return undefined;
  }

  return typeof body === 'string' ? body : JSON.stringify(body);
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, token } = options;

  const accessToken = token ?? getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: serializeBody(body),
  });

  if (response.status === 401) {
    clearAuthSession();
    throw new Error('Your session has expired or you are not logged in.');
  }

  if (!response.ok) {
    const text = await response.text();
    if (!text) {
      throw new Error(`Request failed (${response.status})`);
    }

    let parsed: { message?: string | string[] };
    try {
      parsed = JSON.parse(text) as { message?: string | string[] };
    } catch {
      throw new Error(text);
    }

    if (Array.isArray(parsed.message)) {
      throw new Error(parsed.message.join(' '));
    }

    throw new Error(parsed.message || text);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
