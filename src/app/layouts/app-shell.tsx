import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { routes } from '../../lib/constants/routes';
import { clearAuthSession, getIdentity } from '../../features/auth/auth-store';

type NavItem = {
  to: string;
  label: string;
  allowedRoles?: string[];
};

type NavSection = {
  label?: string;
  items: NavItem[];
  allowedRoles?: string[];
};

const navItems: NavItem[] = [
  { to: routes.dashboard, label: 'Dashboard' },
  { to: routes.inventory, label: 'Inventory' },
  { to: routes.ledger, label: 'Ledger' },
  { to: routes.reservations, label: 'Reservations' },
  { to: routes.salesOrders, label: 'Sales Orders' },
  { to: routes.adjustments, label: 'Adjustments' },
  { to: routes.transfers, label: 'Transfers' },
  { to: routes.recommendations, label: 'Recommendations' },
  { to: routes.purchaseOrders, label: 'Purchase Orders' },
  { to: routes.vendorProducts, label: 'Vendor Products' },
];

const navSections: NavSection[] = [
  { items: navItems },
  {
    label: 'Admin',
    allowedRoles: ['system_admin'],
    items: [
      { to: routes.users, label: 'User Maintenance' },
      { to: routes.vendors, label: 'Vendor Maintenance' },
    ],
  },
];

export default function AppShell() {
  const navigate = useNavigate();
  const identity = getIdentity();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function handleLogout() {
    clearAuthSession();
    navigate(routes.login, { replace: true });
  }

  function canAccess(allowedRoles?: string[]) {
    if (!allowedRoles) return true;
    return identity?.roleCode ? allowedRoles.includes(identity.roleCode) : false;
  }

  const visibleNavSections = navSections
    .map((section) => ({
      ...section,
      items: canAccess(section.allowedRoles)
        ? section.items.filter((item) => canAccess(item.allowedRoles))
        : [],
    }))
    .filter((section) => section.items.length > 0);

  const sidebarContent = (
    <>
      <div className="border-b border-slate-200 p-5">
        <h1 className="text-xl font-bold">NVentory Boss</h1>
        <p className="mt-1 text-sm text-slate-500">Inventory + Procurement</p>
      </div>

      <div className="border-b border-slate-200 px-5 py-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Signed in as
        </p>
        <p className="mt-1 truncate text-sm font-medium text-slate-800">
          {identity?.email ?? 'Unknown user'}
        </p>
        {identity?.roleName || identity?.roleCode ? (
          <p className="mt-1 truncate text-xs font-medium text-slate-500">
            {identity.roleName ?? identity.roleCode?.replaceAll('_', ' ')}
          </p>
        ) : null}
      </div>

      <nav className="flex flex-col gap-4 p-3">
        {visibleNavSections.map((section, index) => (
          <div key={section.label ?? `primary-${index}`}>
            {section.label ? (
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {section.label}
              </p>
            ) : null}

            <div className="flex flex-col gap-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
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
            </div>
          </div>
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
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        {sidebarContent}
      </aside>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-900/45"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      ) : null}

      <main className="min-w-0 flex-1">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6 md:py-4">
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={isMobileMenuOpen}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition hover:bg-slate-100 md:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <span className="sr-only">Open navigation menu</span>
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h2 className="text-lg font-semibold">Operations Console</h2>
        </div>

        <Outlet />
      </main>
    </div>
  );
}
