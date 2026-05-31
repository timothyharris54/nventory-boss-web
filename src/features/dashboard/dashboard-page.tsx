import { getIdentity } from '../auth/auth-store';
import { BuyerDashboard } from './dashboards/buyer-dashboard';
import { ExecutiveDashboard } from './dashboards/executive-dashboard';
import { PlannerDashboard } from './dashboards/planner-dashboard';
import { PurchasingManagerDashboard } from './dashboards/purchasing-manager-dashboard';
import { SystemAdminDashboard } from './dashboards/system-admin-dashboard';
import { WarehouseManagerDashboard } from './dashboards/warehouse-manager-dashboard';
import { WarehouseUserDashboard } from './dashboards/warehouse-user-dashboard';
import { DashboardFrame } from './dashboard-ui';

export default function DashboardPage() {
  const identity = getIdentity();
  const roleCode = identity?.roleCode;

  switch (roleCode) {
    case 'executive':
      return <ExecutiveDashboard />;
    case 'purchasing_manager':
      return <PurchasingManagerDashboard />;
    case 'buyer':
      return <BuyerDashboard />;
    case 'planner':
      return <PlannerDashboard />;
    case 'warehouse_manager':
      return <WarehouseManagerDashboard />;
    case 'warehouse_user':
      return <WarehouseUserDashboard />;
    case 'system_admin':
      return <SystemAdminDashboard />;
    default:
      return (
        <DashboardFrame
          title="Dashboard"
          subtitle="Sign in with a role to load your workspace."
        >
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            No dashboard role is assigned to the current session.
          </div>
        </DashboardFrame>
      );
  }
}
