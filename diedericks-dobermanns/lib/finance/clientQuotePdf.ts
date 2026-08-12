import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { formatAmountPlain, formatDate } from '@/lib/finance/formatters';
import { LOGO_BASE64 } from '@/lib/finance/logoBase64';
import type { QuoteRevisionRow } from '@/lib/finance/quoteRevisions';
import type { ClientQuoteDetail } from '@/lib/portal/clientQuotes';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Builds printable HTML from live quote rows or a sent revision snapshot. */
export function buildClientQuoteHtml(
  quote: ClientQuoteDetail,
  snapshot?: QuoteRevisionRow['snapshot'] | null,
): string {
  const number = snapshot?.quote_number ?? quote.quote_number;
  const revision = snapshot?.revision ?? quote.last_sent_revision ?? quote.revision ?? 1;
  const total = Number(snapshot?.total ?? quote.total);
  const items =
    snapshot?.items?.map((it) => ({
      description: it.description,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      line_total: Number(it.line_total),
    })) ?? quote.items;

  const rows = items
    .map(
      (it) => `
      <tr>
        <td style="padding:8px 0; border-bottom:1px solid #eee;">${escapeHtml(it.description)}</td>
        <td style="padding:8px 0; border-bottom:1px solid #eee; text-align:right;">${formatAmountPlain(it.line_total)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
    <style>
      body { font-family: Georgia, serif; color: #1a1a1a; padding: 32px; }
      h1 { font-size: 22px; letter-spacing: 3px; text-transform: uppercase; margin: 0; }
      .gold { color: #C4A35A; }
      .meta { font-size: 12px; color: #666; margin-top: 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 28px; font-size: 14px; }
      .total { font-size: 20px; color: #C4A35A; margin-top: 16px; padding-top: 12px; border-top: 1px solid #C4A35A55; }
    </style></head><body>
      <img src="${LOGO_BASE64}" alt="Diedericks Dobermanns" style="height:48px; margin-bottom:16px;" />
      <h1>Diedericks Dobermanns</h1>
      <p class="gold" style="letter-spacing:2px; text-transform:uppercase; font-size:11px;">Quotation</p>
      <p class="meta">${escapeHtml(number)}${revision > 1 ? ` · Revision ${revision}` : ''}</p>
      <p class="meta">Date ${formatDate(quote.sent_at ?? quote.created_at)} · Valid until ${formatDate(quote.valid_until)}</p>
      <table>${rows}</table>
      <p class="total">Total R${formatAmountPlain(total)}</p>
      ${quote.notes ? `<p style="margin-top:24px; font-size:13px;">${escapeHtml(quote.notes)}</p>` : ''}
    </body></html>`;
}

export async function shareClientQuotePdf(
  quote: ClientQuoteDetail,
  snapshot?: QuoteRevisionRow['snapshot'] | null,
): Promise<void> {
  const html = buildClientQuoteHtml(quote, snapshot);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Quote ${quote.quote_number}`,
    UTI: 'com.adobe.pdf',
  });
}
