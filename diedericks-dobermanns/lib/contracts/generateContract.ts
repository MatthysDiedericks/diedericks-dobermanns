import { format } from 'date-fns';

import { formatPrice, titleCase } from '@/lib/format';
import { mergeContractTemplate, type ContractMergeData } from '@/lib/contracts/templateMerge';

export { mergeContractTemplate };
export type { ContractMergeData };

export interface ContractSourceData {
  buyerName: string | null;
  dogName: string;
  dateOfBirth: string | null;
  sex: string | null;
  colour: string | null;
  microchipNumber: string | null;
  registrationNumber: string | null;
  litterName: string | null;
  sireName: string | null;
  damName: string | null;
  /** Rand amount — prefer the negotiated reservation price over the list price. */
  price: number | null;
}

/** Maps raw DB fields (already fetched by the caller) into the template's real token set. */
export function buildContractMergeData(source: ContractSourceData): ContractMergeData {
  return {
    buyer_name: source.buyerName ?? '—',
    dog_name: source.dogName,
    dob: source.dateOfBirth ? format(new Date(source.dateOfBirth), 'd MMMM yyyy') : '—',
    sex: source.sex ? titleCase(source.sex) : '—',
    colour: source.colour ? titleCase(source.colour.replace(/_/g, ' ')) : '—',
    microchip: source.microchipNumber ?? '—',
    litter: source.litterName ?? '—',
    sire: source.sireName ?? '—',
    dam: source.damName ?? '—',
    price: formatPrice(source.price),
    date: format(new Date(), 'd MMMM yyyy'),
    registration_number: source.registrationNumber ?? '—',
  };
}

/** Wraps the merged template body in a printable, branded HTML document for `expo-print`. */
export function buildContractHtml(contractTitle: string, mergedBodyHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Georgia, serif; background: #fff; color: #1a1a1a; padding: 40px; }
        .brand { font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #C4A35A; margin-bottom: 4px; }
        h2 { font-size: 20px; letter-spacing: 1px; margin-top: 0; }
        h3 { font-size: 13px; letter-spacing: 1px; text-transform: uppercase; color: #C4A35A;
             border-bottom: 1px solid #C4A35A; padding-bottom: 4px; margin-top: 28px; }
        p { font-size: 14px; line-height: 1.6; }
        .footer { margin-top: 48px; font-size: 10px; color: #999;
                  border-top: 1px solid #eee; padding-top: 12px; }
      </style>
    </head>
    <body>
      <div class="brand">Diedericks Dobermanns</div>
      ${mergedBodyHtml}
      <div class="footer">
        ${contractTitle} · Generated ${format(new Date(), 'd MMM yyyy, HH:mm')} · CONFIDENTIAL
      </div>
    </body>
    </html>
  `;
}
