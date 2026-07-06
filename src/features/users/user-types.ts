export type UserRoleCode =
  | 'executive'
  | 'purchasing_manager'
  | 'buyer'
  | 'planner'
  | 'warehouse_manager'
  | 'warehouse_user'
  | 'system_admin';

export type UserRole = {
  code: UserRoleCode;
  displayName: string;
  description?: string | null;
  isActive?: boolean;
};

export type UserMaintenanceItem = {
  id: string;
  accountId: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  roles: UserRole[];
  createdAt: string;
  updatedAt: string;
};

export type CreateUserRequest = {
  email: string;
  fullName?: string;
  temporaryPassword: string;
  isActive?: boolean;
  roleCodes: UserRoleCode[];
};

export type UpdateUserRequest = {
  email?: string;
  fullName?: string | null;
  isActive?: boolean;
  roleCodes?: UserRoleCode[];
};
