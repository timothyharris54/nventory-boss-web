import type { UserRoleCode } from '../users/user-types';

export type AuthIdentity = {
  userId: string;
  accountId: string;
  email: string;
  roleCode?: UserRoleCode;
  roleName?: string;
};

export type LoginResponse = {
  accessToken: string;
  identity: AuthIdentity;
  availableRoles?: {
    code: UserRoleCode;
    displayName: string;
  }[];
};

export type LoginRequest = {
  email: string;
  password: string;
  roleCode?: UserRoleCode;
};
