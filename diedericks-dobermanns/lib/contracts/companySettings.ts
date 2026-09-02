import { requireSupabase } from '@/lib/supabase';

export type CompanyProfile = {
  email: string | null;
  contactEmail: string | null;
  phone: string | null;
};

const KEYS = {
  email: 'contact_email',
  quoteEmail: 'quote_email',
  phone: 'contact_phone',
  breedingPenaltyAmount: 'breeding_penalty_amount',
} as const;

function trimOrNull(value: string | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

export function companyProfileFromSettings(settings: Record<string, string>): CompanyProfile {
  const contactEmail = trimOrNull(settings[KEYS.email]);
  const quoteEmail = trimOrNull(settings[KEYS.quoteEmail]);
  return {
    contactEmail,
    email: quoteEmail ?? contactEmail,
    phone: trimOrNull(settings[KEYS.phone]),
  };
}

export async function loadContractSettings(): Promise<
  { settings: Record<string, string>; breedingPenalty: string } | { error: string }
> {
  const supabase = requireSupabase();
  const { data: settingsRows, error: sErr } = await supabase.from('app_settings').select('key, value');
  if (sErr) return { error: sErr.message };
  const settings: Record<string, string> = {};
  for (const row of settingsRows ?? []) {
    if (row.value) settings[row.key] = row.value;
  }
  const breedingPenaltyRaw = settings[KEYS.breedingPenaltyAmount]?.trim() ?? '';
  if (!breedingPenaltyRaw) {
    return {
      error:
        'app_settings.breeding_penalty_amount is blank. Set it under Admin → Settings (Company) before the agreement can be created.',
    };
  }
  const breedingPenaltyNum = Number(breedingPenaltyRaw.replace(/,/g, ''));
  const { formatAmount } = await import('@/lib/finance/formatters');
  const breedingPenalty = Number.isFinite(breedingPenaltyNum)
    ? formatAmount(breedingPenaltyNum)
    : breedingPenaltyRaw;
  return { settings, breedingPenalty };
}
