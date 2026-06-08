import { Link } from 'react-router-dom';
import type { DashboardAction, DashboardMetric } from './role-dashboard-types';
import { SalesRefreshPanel } from './sales-refresh-panel';

type DashboardFrameProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  showSalesRefreshPanel?: boolean;
};

type MetricGridProps = {
  metrics: DashboardMetric[];
};

type ActionPanelProps = {
  title: string;
  actions: DashboardAction[];
  emptyMessage: string;
};

const metricToneClasses = {
  neutral: 'text-slate-900',
  good: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
};

const actionToneClasses = {
  neutral: 'border-slate-200 bg-white',
  warning: 'border-amber-200 bg-amber-50',
  danger: 'border-red-200 bg-red-50',
};

export function DashboardFrame({
  title,
  subtitle,
  children,
  showSalesRefreshPanel = false,
}: DashboardFrameProps) {
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      </div>

      {showSalesRefreshPanel ? (
        <div className="mb-4">
          <SalesRefreshPanel />
        </div>
      ) : null}

      {children}
    </div>
  );
}

export function MetricGrid({ metrics }: MetricGridProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase text-slate-500">
            {metric.label}
          </p>
          <p
            className={[
              'mt-2 text-2xl font-bold',
              metricToneClasses[metric.tone ?? 'neutral'],
            ].join(' ')}
          >
            {metric.value}
          </p>
          {metric.detail ? (
            <p className="mt-1 text-sm text-slate-600">{metric.detail}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ActionPanel({ title, actions, emptyMessage }: ActionPanelProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>

      <div className="divide-y divide-slate-200">
        {actions.length === 0 ? (
          <p className="px-4 py-5 text-sm text-slate-600">{emptyMessage}</p>
        ) : (
          actions.map((action) => {
            const content = (
              <>
                <p className="text-sm font-semibold text-slate-900">
                  {action.label}
                </p>
                {action.detail ? (
                  <p className="mt-1 text-sm text-slate-600">{action.detail}</p>
                ) : null}
              </>
            );

            return (
              <div
                key={`${action.label}-${action.detail ?? ''}`}
                className={[
                  'm-3 rounded-lg border p-3',
                  actionToneClasses[action.tone ?? 'neutral'],
                ].join(' ')}
              >
                {action.to ? (
                  <Link to={action.to} className="block hover:underline">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function DashboardError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message}
    </div>
  );
}

export function DashboardLoading() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
      Loading dashboard...
    </div>
  );
}
