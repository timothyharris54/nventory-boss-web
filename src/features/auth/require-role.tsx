import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { routes } from '../../lib/constants/routes';
import { getIdentity } from './auth-store';
import type { UserRoleCode } from '../users/user-types';

type RequireRoleProps = {
  allowedRoles: UserRoleCode[];
  children: ReactNode;
};

export default function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const roleCode = getIdentity()?.roleCode;

  if (!roleCode || !allowedRoles.includes(roleCode)) {
    return <Navigate to={routes.dashboard} replace />;
  }

  return children;
}
