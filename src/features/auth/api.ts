import { apiFetch } from '../../lib/api/client';
import type { LoginRequest, LoginResponse } from './types';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  });
}