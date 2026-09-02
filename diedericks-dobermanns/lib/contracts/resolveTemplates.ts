import { requireSupabase } from '@/lib/supabase';

export type ContractTemplateRow = {
  id: string;
  name: string;
  contract_title: string;
  body_html: string;
  version: number | null;
  programme_tier: string | null;
  is_addendum: boolean | null;
};

/** Default templates from dogs.programme_tier. Matt can override the main id. */
export async function resolveSaleTemplates(
  programmeTier: string,
  overrideMainId?: string | null,
): Promise<
  | { main: ContractTemplateRow; addendum: ContractTemplateRow | null; error?: undefined }
  | { main?: undefined; addendum?: undefined; error: string }
> {
  const supabase = requireSupabase();
  const { data: templates, error: tErr } = await supabase
    .from('contract_templates')
    .select('id, name, contract_title, body_html, version, programme_tier, is_addendum, is_active')
    .eq('is_active', true);
  if (tErr) return { error: tErr.message };

  const rows = (templates ?? []) as unknown as ContractTemplateRow[];
  const puppyMain =
    rows.find((t) => !t.is_addendum && (t.programme_tier == null || t.programme_tier === 'puppy')) ??
    rows.find((t) => !t.is_addendum);
  const protection = rows.find((t) => !t.is_addendum && t.programme_tier === 'protection_dog');
  const eliteAddendum =
    rows.find((t) => t.is_addendum && t.programme_tier === 'elite_developed') ?? null;

  let main = puppyMain;
  if (programmeTier === 'protection_dog') main = protection ?? puppyMain;

  if (overrideMainId) {
    const override = rows.find((t) => t.id === overrideMainId);
    if (!override) return { error: 'That template is not active.' };
    if (override.is_addendum) return { error: 'Pick the main agreement, not an addendum.' };
    main = override;
  }

  if (!main) {
    return {
      error:
        'No main sale agreement template is active. Apply migration 0057 (LEGAL seed) in Supabase, then retry.',
    };
  }

  const wantsAddendum =
    programmeTier === 'elite_developed' &&
    (main.programme_tier == null || main.programme_tier === 'puppy');
  const addendum = wantsAddendum ? eliteAddendum : null;
  if (wantsAddendum && !addendum) {
    return {
      error:
        'Elite developed dog requires Addendum A, but that template is missing. Apply migration 0057, then retry.',
    };
  }

  return { main, addendum };
}
