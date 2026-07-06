import { apiFetch } from '../../lib/api/client';
import type {
  LoginRequest,
  LoginResponse,
  PasswordResetCompleteRequest,
  PasswordResetRequest,
  SessionResponse,
  SwitchRoleRequest,
} from './types';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export async function getSession(): Promise<SessionResponse> {
  return apiFetch<SessionResponse>('/auth/session');
}

export async function switchRole(
  payload: SwitchRoleRequest,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/switch-role', {
    method: 'POST',
    body: payload,
  });
}

export async function requestPasswordReset(
  payload: PasswordResetRequest,
): Promise<void> {
  return apiFetch<void>('/auth/password-reset/request', {
    method: 'POST',
    body: payload,
  });
}

export async function completePasswordReset(
  payload: PasswordResetCompleteRequest,
): Promise<void> {
  return apiFetch<void>('/auth/password-reset/complete', {
    method: 'POST',
    body: payload,
  });
}
