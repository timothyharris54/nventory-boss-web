export type Vendor = {
  id: string;
  accountId: string;
  platformId: string | null;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  defaultLeadTimeDays: number | null;
  paymentTerms: string | null;
  isActive: boolean;
  isPreferred?: boolean;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
  platform?: VendorPlatform | null;
};

export type CreateVendorRequest = {
  name: string;
  platformId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  defaultLeadTimeDays?: number;
  paymentTerms?: string;
  isActive?: boolean;
  notes?: string;
};

export type UpdateVendorRequest = Partial<CreateVendorRequest>;

export type VendorPlatform = {
  id: string;
  accountId: string;
  name: string;
  websiteUrl: string | null;
  loginUrl: string | null;
  username: string | null;
  paymentTerms: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  isActive: boolean;
  hasCredentials: boolean;
  credentialKeys: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type CreateVendorPlatformRequest = {
  name: string;
  websiteUrl?: string;
  loginUrl?: string;
  username?: string;
  credentials?: Record<string, unknown>;
  paymentTerms?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  isActive?: boolean;
};

export type UpdateVendorPlatformRequest = Partial<CreateVendorPlatformRequest>;
