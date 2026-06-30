import type { UserRoleCode } from '../users/user-types';

export type AuthIdentity = {
  userId: string;
  accountId: string;
  email: string;
  roleCode?: UserRoleCode;
  roleName?: string;
};

export type AvailableRole = {
  code: UserRoleCode;
  displayName: string;
};

export type LoginResponse = {
  accessToken: string;
  identity: AuthIdentity;
  availableRoles: AvailableRole[];
};

export type SessionResponse = {
  identity: AuthIdentity;
  availableRoles: AvailableRole[];
};

export type LoginRequest = {
  email: string;
  password: string;
  roleCode?: UserRoleCode;
};

export type SwitchRoleRequest = {
  roleCode: UserRoleCode;
};

export type PasswordResetRequest = {
  email: string;
};

export type PasswordResetCompleteRequest = {
  token: string;
  password: string;
};
