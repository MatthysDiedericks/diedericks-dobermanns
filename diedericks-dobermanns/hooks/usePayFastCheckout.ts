import { useState } from 'react';

import { isPayFastConfigured } from '@/lib/payments/payfast';
import { supabase } from '@/lib/supabase';
import type { CreatePaymentRequest } from '@/lib/payments/payfast';

interface CheckoutResult {
  html: string | null;
  mPaymentId: string | null;
  error: string | null;
}

/** Creates a PayFast checkout session via the Supabase edge function. */
export function usePayFastCheckout() {
  const [loading, setLoading] = useState(false);

  async function startCheckout(request: CreatePaymentRequest): Promise<CheckoutResult> {
    if (!isPayFastConfigured()) {
      return { html: null, mPaymentId: null, error: 'Online payments are not configured yet.' };
    }
    if (!supabase) {
      return { html: null, mPaymentId: null, error: 'Supabase is not configured.' };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payfast-payment', {
        body: request,
      });
      if (error) {
        return { html: null, mPaymentId: null, error: error.message };
      }
      const payload = data as { html?: string; mPaymentId?: string; error?: string };
      if (payload.error) {
        return { html: null, mPaymentId: null, error: payload.error };
      }
      return {
        html: payload.html ?? null,
        mPaymentId: payload.mPaymentId ?? null,
        error: null,
      };
    } catch (e) {
      return { html: null, mPaymentId: null, error: String(e) };
    } finally {
      setLoading(false);
    }
  }

  return { startCheckout, loading };
}
