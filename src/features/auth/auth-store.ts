import type {
  AuthIdentity,
  AvailableRole,
  LoginResponse,
  SessionResponse,
} from './types';

const ACCESS_TOKEN_KEY = 'nventoryboss.accessToken';
const IDENTITY_KEY = 'nventoryboss.identity';
const AVAILABLE_ROLES_KEY = 'nventoryboss.availableRoles';

export function saveAuthSession(session: LoginResponse) {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  saveSessionDetails(session);
}

export function saveSessionDetails(session: SessionResponse) {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(session.identity));
  localStorage.setItem(
    AVAILABLE_ROLES_KEY,
    JSON.stringify(session.availableRoles),
  );
}

export function getAvailableRoles(): AvailableRole[] {
  const raw = localStorage.getItem(AVAILABLE_ROLES_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as AvailableRole[];
  } catch {
    return [];
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getIdentity(): AuthIdentity | null {
  const raw = localStorage.getItem(IDENTITY_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthIdentity;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(IDENTITY_KEY);
  localStorage.removeItem(AVAILABLE_ROLES_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}
