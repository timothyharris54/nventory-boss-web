import { Navigate, useRoutes } from 'react-router-dom';
import AppShell from '../layouts/app-shell';
import DashboardPage from '../../features/dashboard/dashboard-page';
import ProductMaintenancePage from '../../features/products/product-maintenance-page';
import InventoryPage from '../../features/inventory/inventory-page';
import LedgerPage from '../../features/ledger/ledger-page';
import ReservationsPage from '../../features/reservations/reservations-page';
import SalesOrdersPage from '../../features/sales/sales-orders-page';
import AdjustmentsPage from '../../features/movements/adjustments-page';
import TransfersPage from '../../features/movements/transfers-page';
import RecommendationsPage from '../../features/procurement/recommendations-page';
import PurchaseOrdersPage from '../../features/procurement/purchase-orders-page';
import VendorProductsPage from '../../features/vendor-products/vendor-products-page';
import EcommerceConnectionsPage from '../../features/setup/ecommerce-connections-page';
import UsersPage from '../../features/users/users-page';
import AddressesPage from '../../features/addresses/addresses-page';
import VendorsPage from '../../features/vendors/vendors-page';
import SubscriptionMaintenancePage from '../../features/subscriptions/subscription-maintenance-page';
import LoginPage from '../../features/auth/login-page';
import RequireAuth from '../../features/auth/require-auth';
import RequireRole from '../../features/auth/require-role';
import { routes } from '../../lib/constants/routes';

export function AppRouter() {
  return useRoutes([
    {
      path: routes.login,
      element: <LoginPage />,
    },
    {
      path: routes.passwordReset,
      element: <LoginPage />,
    },
    {
      element: <RequireAuth />,
      children: [
        {
          path: '/',
          element: <AppShell />,
          children: [
            { index: true, element: <Navigate to={routes.dashboard} replace /> },
            { path: routes.dashboard.slice(1), element: <DashboardPage /> },
            {
              path: routes.productMaintenance.slice(1),
              element: <ProductMaintenancePage />,
            },
            { path: routes.inventory.slice(1), element: <InventoryPage /> },
            { path: routes.ledger.slice(1), element: <LedgerPage /> },
            { path: routes.reservations.slice(1), element: <ReservationsPage /> },
            { path: routes.salesOrders.slice(1), element: <SalesOrdersPage /> },
            { path: routes.adjustments.slice(1), element: <AdjustmentsPage /> },
            { path: routes.transfers.slice(1), element: <TransfersPage /> },
            {
              path: routes.recommendations.slice(1),
              element: <RecommendationsPage />,
            },
            {
              path: routes.purchaseOrders.slice(1),
              element: <PurchaseOrdersPage />,
            },
            {
              path: routes.vendorProducts.slice(1),
              element: <VendorProductsPage />,
            },
            {
              path: routes.ecommerceConnections.slice(1),
              element: (
                <RequireRole allowedRoles={['system_admin', 'account_admin']}>
                  <EcommerceConnectionsPage />
                </RequireRole>
              ),
            },
            {
              path: routes.users.slice(1),
              element: <UsersPage />,
            },
            {
              path: routes.addresses.slice(1),
              element: <AddressesPage />,
            },
            {
              path: routes.vendors.slice(1),
              element: <VendorsPage />,
            },
            {
              path: routes.subscriptionMaintenance.slice(1),
              element: <SubscriptionMaintenancePage />,
            },
          ],
        },
      ],
    },
  ]);
}
