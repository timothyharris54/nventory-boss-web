import { useQuery } from '@tanstack/react-query';
import { routes } from '../../../lib/constants/routes';
import { getRecommendations } from '../../procurement/api';
import {
  ActionPanel,
  DashboardError,
  DashboardFrame,
  DashboardLoading,
  MetricGrid,
} from '../dashboard-ui';
import {
  formatCount,
  getCriticalRecommendations,
  getOpenRecommendations,
  toNumber,
} from '../dashboard-utils';

export function PlannerDashboard() {
  const recommendationsQuery = useQuery({
    queryKey: ['recommendations', { status: 'open', take: 50 }],
    queryFn: () => getRecommendations({ status: 'open', take: 50 }),
  });

  const isLoading = recommendationsQuery.isLoading;
  const error = recommendationsQuery.error;
  const recommendations = recommendationsQuery.data ?? [];
  const openRecommendations = getOpenRecommendations(recommendations);
  const criticalRecommendations = getCriticalRecommendations(recommendations);
  const zeroAvailableRecommendations = openRecommendations.filter(
    (recommendation) => toNumber(recommendation.qtyAvailableSnapshot) <= 0,
  );
  const incomingRecommendations = openRecommendations.filter(
    (recommendation) => toNumber(recommendation.qtyIncomingSnapshot) > 0,
  );

  return (
    <DashboardFrame
      title="Planner Dashboard"
      subtitle="Demand-driven replenishment, stockout risk, and inventory coverage."
      showSalesRefreshPanel
    >
      {isLoading ? <DashboardLoading /> : null}
      {error ? <DashboardError message={(error as Error).message} /> : null}

      {!isLoading && !error ? (
        <div className="space-y-4">
          <MetricGrid
            metrics={[
              {
                label: 'Open recommendations',
                value: formatCount(openRecommendations.length),
                detail: 'Planning actions waiting',
                tone: openRecommendations.length ? 'warning' : 'good',
              },
              {
                label: 'Critical stockout risk',
                value: formatCount(criticalRecommendations.length),
                detail: 'Seven days or less',
                tone: criticalRecommendations.length ? 'danger' : 'good',
              },
              {
                label: 'Zero available',
                value: formatCount(zeroAvailableRecommendations.length),
                detail: 'Open recommendations with no availability',
                tone: zeroAvailableRecommendations.length ? 'danger' : 'good',
              },
              {
                label: 'Incoming supply',
                value: formatCount(incomingRecommendations.length),
                detail: 'Recommended items with inbound quantity',
              },
            ]}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <ActionPanel
              title="Planning Actions"
              emptyMessage="No planning actions need attention."
              actions={criticalRecommendations.slice(0, 6).map((recommendation) => ({
                label: `${recommendation.product?.sku ?? recommendation.productId} - stockout risk`,
                detail: `${recommendation.recommendedQty} recommended for ${recommendation.locationCode}`,
                to: routes.recommendations,
                tone: 'danger',
              }))}
            />

            <ActionPanel
              title="Inventory Coverage"
              emptyMessage="No zero availability recommendations."
              actions={zeroAvailableRecommendations.slice(0, 6).map((recommendation) => ({
                label: `${recommendation.product?.sku ?? recommendation.productId} - ${recommendation.product?.name ?? 'Product'}`,
                detail: `${recommendation.qtyAvailableSnapshot} available, ${recommendation.qtyIncomingSnapshot} incoming`,
                to: routes.recommendations,
                tone: 'warning',
              }))}
            />
          </div>
        </div>
      ) : null}
    </DashboardFrame>
  );
}
