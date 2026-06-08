export type Vendor = {
  id: string;
  accountId: string;
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
};

export type CreateVendorRequest = {
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  defaultLeadTimeDays?: number;
  paymentTerms?: string;
  isActive?: boolean;
  notes?: string;
};

export type UpdateVendorRequest = Partial<CreateVendorRequest>;
