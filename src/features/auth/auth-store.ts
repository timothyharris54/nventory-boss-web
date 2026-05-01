import type { AuthIdentity, LoginResponse } from './types';

const ACCESS_TOKEN_KEY = 'nventoryboss.accessToken';
const IDENTITY_KEY = 'nventoryboss.identity';

export function saveAuthSession(session: LoginResponse) {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(session.identity));
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
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}