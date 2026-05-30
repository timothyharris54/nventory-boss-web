import { apiFetch } from '../../lib/api/client';
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserMaintenanceItem,
  UserRole,
} from './user-types';

export function getUsers(): Promise<UserMaintenanceItem[]> {
  return apiFetch<UserMaintenanceItem[]>('/users');
}

export function getUserRoles(): Promise<UserRole[]> {
  return apiFetch<UserRole[]>('/users/roles');
}

export function createUser(body: CreateUserRequest): Promise<UserMaintenanceItem> {
  return apiFetch<UserMaintenanceItem>('/users', {
    method: 'POST',
    body,
  });
}

export function updateUser(
  userId: string,
  body: UpdateUserRequest,
): Promise<UserMaintenanceItem> {
  return apiFetch<UserMaintenanceItem>(`/users/${userId}`, {
    method: 'PATCH',
    body,
  });
}

export function disableUser(userId: string): Promise<UserMaintenanceItem> {
  return apiFetch<UserMaintenanceItem>(`/users/${userId}/disable`, {
    method: 'PATCH',
  });
}
