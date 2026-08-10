export type Address = {
  id: string;
  accountId: string;
  addressTypeCode: string;
  label: string | null;
  recipientName: string | null;
  companyName: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
  createdAt: string;
  updatedAt: string;
};

export type AddressRequest = {
  addressTypeCode: string;
  label?: string | null;
  recipientName?: string | null;
  companyName?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  region?: string | null;
  postalCode?: string | null;
  countryCode: string;
};

export type UpdateAddressRequest = Partial<AddressRequest>;
