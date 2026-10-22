import { getAccessToken, clearAuthSession } from '../../features/auth/auth-store';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '/api';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string;
};

type ApiErrorResponse = {
  message?: string | string[];
  error?: string;
  response?: string;
  status?: number;
};

function getApiErrorMessage(parsed: ApiErrorResponse, fallback: string): string {
  const message = Array.isArray(parsed.message)
    ? parsed.message.join(' ')
    : parsed.message;
  const genericHttpErrors = new Set([
    'Bad Request',
    'Unauthorized',
    'Forbidden',
    'Not Found',
    'Internal Server Error',
    'Bad Gateway',
  ]);
  const errorDetail = parsed.error?.trim();
  const upstreamDetail =
    parsed.response?.trim() ||
    (errorDetail && !genericHttpErrors.has(errorDetail)
      ? errorDetail
      : undefined);

  if (!upstreamDetail) {
    return message || fallback;
  }

  let detail = upstreamDetail;
  try {
    const upstream = JSON.parse(upstreamDetail) as { message?: string };
    if (upstream.message) detail = upstream.message;
  } catch {
    // The upstream response may be plain text (for example, a proxy error).
  }

  const status = parsed.status ? ` (upstream ${parsed.status})` : '';
  return `${message || 'Request failed'}${status}: ${detail}`;
}

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

    let parsed: ApiErrorResponse;
    try {
      parsed = JSON.parse(text) as ApiErrorResponse;
    } catch {
      throw new Error(text);
    }

    throw new Error(getApiErrorMessage(parsed, text));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
