export type SubscriptionStatus =
  'trialing' | 'active' | 'past_due' | 'paused' | 'cancelled' | 'expired';

export type BillingInterval = 'monthly' | 'yearly';

export type PlanPrice = {
  billingProvider: string;
  billingInterval: BillingInterval;
  currencyCode: string;
  unitAmountMinor: number;
};

export type PlanEntitlement = {
  code: string;
  displayName: string;
  enabled: boolean;
  limit: number | null;
};

export type SubscriptionPlan = {
  code: string;
  displayName: string;
  description: string | null;
  prices: PlanPrice[];
  entitlements: PlanEntitlement[];
};

export type EffectiveEntitlement = PlanEntitlement & {
  description: string | null;
  source: 'plan' | 'override' | 'unassigned';
  overrideExpiresAt: string | null;
};

export type AccountSubscriptionSummary = {
  subscription: {
    id: string;
    status: SubscriptionStatus;
    plan: {
      code: string;
      displayName: string;
      description: string | null;
    };
    price: PlanPrice | null;
    billingProvider: string | null;
    trialEndsAt: string | null;
    currentPeriodStartsAt: string | null;
    currentPeriodEndsAt: string | null;
    cancelAtPeriodEnd: boolean;
    cancelledAt: string | null;
  } | null;
  entitled: boolean;
  entitlements: EffectiveEntitlement[];
};

export type SubscriptionAccountListItem = {
  id: string;
  name: string;
  createdAt: string;
  subscription: {
    status: SubscriptionStatus;
    billingProvider: string | null;
    trialEndsAt: string | null;
    currentPeriodEndsAt: string | null;
    plan: { code: string; displayName: string };
  } | null;
  featureOverrideCount: number;
};

export type SubscriptionAccountList = {
  items: SubscriptionAccountListItem[];
  total: number;
  skip: number;
  take: number;
};

export type CreateAccountRequest = {
  name: string;
  nextPurchaseOrderNumber?: number;
  initialAdmin: {
    fullName: string;
    email: string;
    password: string;
  };
};

export type CreatedAccount = {
  id: string;
  name: string;
};

export type FeatureOverride = {
  id: string;
  feature: { code: string; displayName: string };
  enabled: boolean;
  limit: number | null;
  reason: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminAccountSubscriptionSummary = AccountSubscriptionSummary & {
  account: { id: string; name: string };
  featureOverrides: FeatureOverride[];
};

export type UpsertAccountSubscriptionRequest = {
  planCode: string;
  status: SubscriptionStatus;
  trialEndsAt?: string | null;
  currentPeriodStartsAt?: string | null;
  currentPeriodEndsAt?: string | null;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: string | null;
};

export type UpsertFeatureOverrideRequest = {
  enabled: boolean;
  limit?: number | null;
  reason?: string | null;
  expiresAt?: string | null;
};
