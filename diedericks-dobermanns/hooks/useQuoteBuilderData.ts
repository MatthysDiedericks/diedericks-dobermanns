import { useEffect, useState } from 'react';

import { buyerKey, type QuoteBuyerOption } from '@/lib/finance/quoteBuyerOptions';
import { fetchPricingTiers, type PricingTier } from '@/lib/finance/pricingQueries';
import { requireSupabase } from '@/lib/supabase';

export type QuoteDogOption = {
  id: string;
  name: string;
  price: number | null;
  programme_tier: string | null;
  litter_id: string | null;
  litter_default_tier: string | null;
};

export function useQuoteBuilderData(applicationId?: string | null) {
  const [buyers, setBuyers] = useState<QuoteBuyerOption[]>([]);
  const [dogs, setDogs] = useState<QuoteDogOption[]>([]);
  const [tiers, setTiers] = useState<PricingTier[]>([]);

  useEffect(() => {
    const supabase = requireSupabase();
    void Promise.all([
      supabase.from('users').select('id, full_name, email').eq('role', 'client').order('full_name'),
      supabase
        .from('dogs')
        .select(
          'id, name, price, programme_tier, litter_id, litter:litters(default_programme_tier)',
        )
        .neq('status', 'sold')
        .order('name'),
      supabase
        .from('contacts_active' as 'contacts')
        .select('id, full_name, email')
        .order('full_name')
        .limit(200),
      applicationId
        ? supabase
            .from('applications')
            .select('id, full_name, email')
            .eq('id', applicationId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      fetchPricingTiers().catch(() => [] as PricingTier[]),
    ]).then(([users, dogRows, contacts, appRes, pricing]) => {
      const list: QuoteBuyerOption[] = [];
      const app = appRes.data as { id: string; full_name: string; email: string } | null;
      if (app) {
        list.push({
          key: buyerKey('applicant', app.id),
          kind: 'applicant',
          id: app.id,
          label: app.full_name,
          hint: app.email ? `${app.email} · applicant` : 'applicant',
        });
      }
      for (const u of users.data ?? []) {
        list.push({
          key: buyerKey('user', u.id),
          kind: 'user',
          id: u.id,
          label: u.full_name ?? u.email ?? u.id,
          hint: u.email ? `${u.email} · portal` : 'portal',
        });
      }
      for (const c of contacts.data ?? []) {
        list.push({
          key: buyerKey('contact', c.id),
          kind: 'contact',
          id: c.id,
          label: c.full_name,
          hint: c.email ? `${c.email} · contact` : 'contact',
        });
      }
      setBuyers(list);
      setDogs(
        (dogRows.data ?? []).map((d) => {
          const litterRaw = d.litter as
            | { default_programme_tier?: string | null }
            | { default_programme_tier?: string | null }[]
            | null;
          const litter = Array.isArray(litterRaw) ? litterRaw[0] : litterRaw;
          return {
            id: d.id,
            name: d.name,
            price: d.price,
            programme_tier: d.programme_tier,
            litter_id: d.litter_id,
            litter_default_tier: litter?.default_programme_tier ?? null,
          };
        }),
      );
      setTiers(pricing);
    });
  }, [applicationId]);

  return { buyers, dogs, tiers };
}
