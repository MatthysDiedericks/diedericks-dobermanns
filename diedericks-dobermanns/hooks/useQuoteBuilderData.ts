import { useEffect, useState } from 'react';

import { buyerKey, type QuoteBuyerOption } from '@/lib/finance/quoteBuyerOptions';
import { fetchPricingTiers, type PricingTier } from '@/lib/finance/pricingQueries';
import { litterPairLabel, type QuoteLitterOption, type QuotePuppyOption } from '@/lib/finance/quoteSubject';
import { requireSupabase } from '@/lib/supabase';

export type QuoteDogOption = QuotePuppyOption;

type Named = { name: string | null };
type LitterJoin = {
  default_programme_tier?: string | null;
  mother?: Named | Named[] | null;
  father?: Named | Named[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function useQuoteBuilderData(applicationId?: string | null) {
  const [buyers, setBuyers] = useState<QuoteBuyerOption[]>([]);
  const [dogs, setDogs] = useState<QuotePuppyOption[]>([]);
  const [litters, setLitters] = useState<QuoteLitterOption[]>([]);
  const [tiers, setTiers] = useState<PricingTier[]>([]);

  useEffect(() => {
    const supabase = requireSupabase();
    void Promise.all([
      supabase.from('users').select('id, full_name, email').eq('role', 'client').order('full_name'),
      supabase
        .from('dogs')
        .select(
          'id, name, price, programme_tier, litter_id, status, sex, colour, collar_colour, tail_type, birth_order, litter:litters(default_programme_tier, mother:dogs!litters_mother_id_fkey(name), father:dogs!litters_father_id_fkey(name))',
        )
        .neq('status', 'sold')
        .neq('status', 'deceased')
        .order('birth_order', { ascending: true, nullsFirst: false }),
      supabase
        .from('litters')
        .select(
          'id, status, expected_date, default_programme_tier, mother_id, father_id, mother:dogs!litters_mother_id_fkey(name), father:dogs!litters_father_id_fkey(name)',
        )
        .in('status', ['planned', 'expected'])
        .not('mother_id', 'is', null)
        .not('father_id', 'is', null)
        .order('expected_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('contacts_active' as 'contacts')
        .select('id, full_name, email')
        .order('full_name')
        .limit(200),
      applicationId
        ? supabase.from('applications').select('id, full_name, email').eq('id', applicationId).maybeSingle()
        : Promise.resolve({ data: null }),
      fetchPricingTiers().catch(() => [] as PricingTier[]),
    ]).then(([users, dogRows, litterRows, contacts, appRes, pricing]) => {
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
          const litter = one(d.litter as unknown as LitterJoin | LitterJoin[] | null);
          return {
            id: d.id,
            name: d.name,
            price: d.price,
            programme_tier: d.programme_tier,
            litter_id: d.litter_id,
            litter_default_tier: litter?.default_programme_tier ?? null,
              litter_label: litter
              ? litterPairLabel({
                  mother_name: one(litter.mother as Named | Named[] | null)?.name,
                  father_name: one(litter.father as Named | Named[] | null)?.name,
                })
              : '',
            collar_colour: (d as { collar_colour?: string | null }).collar_colour ?? null,
            sex: d.sex,
            colour: d.colour,
            tail_type: (d as { tail_type?: string | null }).tail_type ?? null,
            birth_order: (d as { birth_order?: number | null }).birth_order ?? null,
            status: d.status,
          };
        }),
      );
      setLitters(
        (litterRows.data ?? []).map((l) => ({
          id: l.id,
          mother_name: one(l.mother as unknown as Named | Named[] | null)?.name ?? '',
          father_name: one(l.father as unknown as Named | Named[] | null)?.name ?? '',
          expected_date: l.expected_date,
          status: l.status,
          default_programme_tier: (l as { default_programme_tier?: string | null }).default_programme_tier ?? null,
        })),
      );
      setTiers(pricing);
    });
  }, [applicationId]);

  return { buyers, dogs, litters, tiers };
}
