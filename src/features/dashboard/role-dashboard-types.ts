import type { UserRoleCode } from '../users/user-types';

export type RoleDashboardProps = {
  roleCode: UserRoleCode;
  roleName: string;
};

export type DashboardMetric = {
  label: string;
  value: string | number;
  detail?: string;
  tone?: 'neutral' | 'good' | 'warning' | 'danger';
};

export type DashboardAction = {
  label: string;
  detail?: string;
  to?: string;
  tone?: 'neutral' | 'warning' | 'danger';
};
