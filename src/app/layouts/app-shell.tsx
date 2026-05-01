import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { routes } from '../../lib/constants/routes';
import { clearAuthSession, getIdentity } from '../../features/auth/auth-store';

const navItems = [
  { to: routes.dashboard, label: 'Dashboard' },
  { to: routes.inventory, label: 'Inventory' },
  { to: routes.ledger, label: 'Ledger' },
  { to: routes.reservations, label: 'Reservations' },
  { to: routes.adjustments, label: 'Adjustments' },
  { to: routes.transfers, label: 'Transfers' },
  { to: routes.recommendations, label: 'Recommendations' },
  { to: routes.purchaseOrders, label: 'Purchase Orders' },
];

export default function AppShell() {
  const navigate = useNavigate();
  const identity = getIdentity();

  function handleLogout() {
    clearAuthSession();
    navigate(routes.login, { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="w-64 border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-5">
          <h1 className="text-xl font-bold">NVentory Boss</h1>
          <p className="mt-1 text-sm text-slate-500">Inventory + Procurement</p>
        </div>

        <div className="border-b border-slate-200 px-5 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Signed in as
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {identity?.email ?? 'Unknown user'}
          </p>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto p-3">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1">
        <div className="border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold">Operations Console</h2>
        </div>

        <Outlet />
      </main>
    </div>
  );
}