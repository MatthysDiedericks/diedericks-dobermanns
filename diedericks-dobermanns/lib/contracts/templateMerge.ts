/**
 * Merges a `contract_templates.body_html` string with real sale data.
 *
 * Token list below was read directly from the two live templates ("Puppy
 * Sales Contract" and "Protection Dog Sales Agreement") — do not add tokens
 * the templates don't actually use without checking the DB again.
 */
export interface ContractMergeData {
  buyer_name: string;
  dog_name: string;
  dob: string;
  sex: string;
  colour: string;
  microchip: string;
  litter: string;
  sire: string;
  dam: string;
  price: string;
  date: string;
  /** Not used by the two current templates, but supported for future ones. */
  registration_number?: string;
}

const FALLBACK = '—';

/** Replaces every `{{token}}` in `bodyHtml` with the matching value from `data`. */
export function mergeContractTemplate(bodyHtml: string, data: ContractMergeData): string {
  return bodyHtml.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, rawKey: string) => {
    const key = rawKey as keyof ContractMergeData;
    const value = data[key];
    return value == null || value === '' ? FALLBACK : String(value);
  });
}
