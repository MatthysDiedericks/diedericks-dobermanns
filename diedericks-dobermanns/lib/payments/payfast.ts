export type PayFastConfig = {
  merchantId: string;
  merchantKey: string;
  sandbox: boolean;
};

export type CreatePaymentRequest = {
  orderType: 'video_bundle' | 'deposit' | 'invoice';
  referenceId: string;
  amount: number;
  itemName: string;
  itemDescription?: string;
};

export type CreatePaymentResponse = {
  actionUrl: string;
  fields: Record<string, string>;
  mPaymentId: string;
};

export function getPayFastPublicConfig(): PayFastConfig | null {
  const merchantId = process.env.EXPO_PUBLIC_PAYFAST_MERCHANT_ID ?? '';
  const merchantKey = process.env.EXPO_PUBLIC_PAYFAST_MERCHANT_KEY ?? '';
  if (!merchantId || !merchantKey) return null;
  return {
    merchantId,
    merchantKey,
    sandbox: process.env.EXPO_PUBLIC_PAYFAST_SANDBOX !== 'false',
  };
}

export function isPayFastConfigured(): boolean {
  return getPayFastPublicConfig() !== null;
}
