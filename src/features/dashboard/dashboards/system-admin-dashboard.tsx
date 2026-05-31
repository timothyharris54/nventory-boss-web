import { useQuery } from '@tanstack/react-query';
import { routes } from '../../../lib/constants/routes';
import { getUsers, getUserRoles } from '../../users/api';
import {
  ActionPanel,
  DashboardError,
  DashboardFrame,
  DashboardLoading,
  MetricGrid,
} from '../dashboard-ui';
import { formatCount } from '../dashboard-utils';

export function SystemAdminDashboard() {
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const rolesQuery = useQuery({
    queryKey: ['users', 'roles'],
    queryFn: getUserRoles,
  });

  const isLoading = usersQuery.isLoading || rolesQuery.isLoading;
  const error = usersQuery.error ?? rolesQuery.error;
  const users = usersQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const activeUsers = users.filter((user) => user.isActive);
  const inactiveUsers = users.filter((user) => !user.isActive);
  const usersWithoutRoles = users.filter((user) => user.roles.length === 0);
  const admins = activeUsers.filter((user) =>
    user.roles.some((role) => role.code === 'system_admin'),
  );

  return (
    <DashboardFrame
      title="System Admin Dashboard"
      subtitle="Account access, user health, and configuration readiness."
    >
      {isLoading ? <DashboardLoading /> : null}
      {error ? <DashboardError message={(error as Error).message} /> : null}

      {!isLoading && !error ? (
        <div className="space-y-4">
          <MetricGrid
            metrics={[
              {
                label: 'Active users',
                value: formatCount(activeUsers.length),
                detail: `${inactiveUsers.length} inactive`,
                tone: activeUsers.length > 0 ? 'good' : 'warning',
              },
              {
                label: 'System admins',
                value: formatCount(admins.length),
                detail: 'Guarded from disabling the last admin',
                tone: admins.length > 1 ? 'good' : 'warning',
              },
              {
                label: 'Role catalog',
                value: formatCount(roles.length),
                detail: 'Available dashboard roles',
              },
              {
                label: 'Missing roles',
                value: formatCount(usersWithoutRoles.length),
                detail: 'Users requiring assignment',
                tone: usersWithoutRoles.length ? 'danger' : 'good',
              },
            ]}
          />

          <ActionPanel
            title="Admin Actions"
            emptyMessage="No admin actions need attention."
            actions={[
              ...(usersWithoutRoles.length
                ? [
                    {
                      label: `${usersWithoutRoles.length} users have no roles`,
                      detail: 'Assign roles before these users can sign in.',
                      to: routes.users,
                      tone: 'danger' as const,
                    },
                  ]
                : []),
              ...(admins.length === 1
                ? [
                    {
                      label: 'Only one active system admin',
                      detail: 'Add a backup admin before the demo.',
                      to: routes.users,
                      tone: 'warning' as const,
                    },
                  ]
                : []),
              {
                label: 'Maintain users and role assignments',
                detail: 'Create users, update role access, and disable users.',
                to: routes.users,
              },
            ]}
          />
        </div>
      ) : null}
    </DashboardFrame>
  );
}
