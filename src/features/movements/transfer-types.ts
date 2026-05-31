export type CreateTransferRequest = {
  productId: string;
  fromLocationCode: string;
  toLocationCode: string;
  quantity: string;
  notes?: string;
  occurredAt: string;
};

export type CreateTransferResponse = {
  productId: string;
  fromLocationCode: string;
  toLocationCode: string;
  quantity: string;
  occurredAt: string;
  transferOutLedgerId: string;
  transferInLedgerId: string;
};
