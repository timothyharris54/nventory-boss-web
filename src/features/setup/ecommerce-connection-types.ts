export type EcommerceProvider =
  | 'shopify'
  | 'woocommerce';

export type EcommerceAuthType =
  | 'none'
  | 'basic'
  | 'api_key'
  | 'oauth';

export type EcommerceConnectionStatus =
  | 'connected'
  | 'needs_configuration'
  | 'inactive';

export type EcommerceConnection = {
  id: string;
  provider: EcommerceProvider;
  channelKey: string | null;
  displayName: string;
  storeUrl: string | null;
  externalStoreId: string | null;
  authType: EcommerceAuthType | null;
  credentials?: Record<string, unknown> | null;
  hasCredentials?: boolean;
  credentialKeys?: string[];
  settings?: Record<string, unknown> | null;
  defaultLocationCode: string | null;
  currencyCode: string | null;
  isActive: boolean;
  lastConnectionTestedAt?: string | null;
  lastConnectionStatus?: string | null;
  lastConnectionError?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateEcommerceConnectionRequest = {
  provider: EcommerceProvider;
  channelKey?: string;
  displayName: string;
  storeUrl?: string;
  externalStoreId?: string;
  authType?: EcommerceAuthType;
  credentials?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  defaultLocationCode?: string;
  currencyCode?: string;
  isActive?: boolean;
};

export type UpdateEcommerceConnectionRequest =
  Partial<CreateEcommerceConnectionRequest>;

export type EcommerceConnectionTestResponse = {
  connectionId: string;
  ok: boolean;
  productsEndpoint?: string;
  sampleCount?: number;
  message?: string;
};
