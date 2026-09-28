/**
 * Live bank details for quotes, invoices, statements and the portal.
 * Never snapshot these onto a document row — a template change must apply
 * to every existing quote the next time it renders.
 */

export type BankAudience = 'domestic' | 'international' | 'both';
export type BankKind = 'domestic' | 'international';

export type BankField = { label: string; value: string };

export type BankBlock = {
  kind: BankKind;
  heading: string;
  rows: BankField[];
  note: string | null;
};

const SA_ALIASES = new Set(['south africa', 'za', 'rsa', 'sa']);

const DEFAULT_DOMESTIC_LABEL = 'South African clients';
const DEFAULT_INTL_LABEL = 'International & SADC clients';

function trimOrNull(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function firstText(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = trimOrNull(value);
    if (trimmed) return trimmed;
  }
  return null;
}

/**
 * South Africa pays Standard Bank. Everyone else pays the Discovery account.
 * A client with no country on file gets BOTH, clearly labelled — guessing wrong
 * sends a client's money to the wrong bank, which is worse than showing two.
 */
export function bankAudienceFor(country: string | null | undefined): BankAudience {
  if (country == null) return 'both';
  const trimmed = country.trim();
  if (!trimmed) return 'both';
  if (SA_ALIASES.has(trimmed.toLowerCase())) return 'domestic';
  return 'international';
}

/**
 * Contact (CRM) first — that table is the kennel's market book.
 * Application next (the enquiry). Portal user last.
 */
export function paymentCountryFor(sources: {
  contactCountry?: string | null;
  applicationCountry?: string | null;
  clientCountry?: string | null;
}): string | null {
  return firstText(sources.contactCountry, sources.applicationCountry, sources.clientCountry);
}

export function settingEnabled(value: string | null | undefined): boolean {
  const t = value?.trim().toLowerCase();
  return t === 'true' || t === '1' || t === 'yes';
}

export type BankAccountFields = {
  heading: string;
  accountName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountType: string | null;
  branchCode: string | null;
  branchName: string | null;
  swift: string | null;
  address: string | null;
  note: string | null;
};

export type BankAccountsSettings = {
  intlEnabled: boolean;
  domestic: BankAccountFields;
  international: BankAccountFields;
};

export function accountsFromSettings(settings: Record<string, string>): BankAccountsSettings {
  const intlRaw = settings.bank_intl_enabled;
  return {
    intlEnabled: intlRaw == null || intlRaw === '' ? true : settingEnabled(intlRaw),
    domestic: {
      heading: trimOrNull(settings.bank_domestic_label) ?? DEFAULT_DOMESTIC_LABEL,
      accountName: trimOrNull(settings.bank_account_name),
      bankName: trimOrNull(settings.bank_name),
      accountNumber: trimOrNull(settings.bank_account_number),
      accountType: null,
      branchCode: trimOrNull(settings.bank_branch_code),
      branchName: null,
      swift: trimOrNull(settings.bank_swift),
      address: trimOrNull(settings.bank_address),
      note: trimOrNull(settings.bank_account_note),
    },
    international: {
      heading: trimOrNull(settings.bank_intl_label) ?? DEFAULT_INTL_LABEL,
      accountName: trimOrNull(settings.bank_intl_account_name),
      bankName: trimOrNull(settings.bank_intl_bank_name),
      accountNumber: trimOrNull(settings.bank_intl_account_number),
      accountType: trimOrNull(settings.bank_intl_account_type),
      branchCode: trimOrNull(settings.bank_intl_branch_code),
      branchName: trimOrNull(settings.bank_intl_branch_name),
      swift: trimOrNull(settings.bank_intl_swift),
      address: trimOrNull(settings.bank_intl_address),
      note: trimOrNull(settings.bank_intl_note),
    },
  };
}

/**
 * When the international switch is off, everyone sees the domestic block —
 * including a non-SA client. The switch is the master.
 */
export function visibleBankKinds(audience: BankAudience, intlEnabled: boolean): BankKind[] {
  if (!intlEnabled) return ['domestic'];
  if (audience === 'domestic') return ['domestic'];
  if (audience === 'international') return ['international'];
  return ['domestic', 'international'];
}

function rowsFor(kind: BankKind, account: BankAccountFields): BankField[] {
  const rows: BankField[] = [];
  const push = (label: string, value: string | null) => {
    if (value) rows.push({ label, value });
  };
  push('Account name', account.accountName);
  push('Bank', account.bankName);
  push('Account number', account.accountNumber);
  if (kind === 'international') {
    push('Account type', account.accountType);
    push('Branch name', account.branchName);
  }
  push('Branch code', account.branchCode);
  push('SWIFT', account.swift);
  push('Bank address', account.address);
  return rows;
}

function labelledHeading(kind: BankKind, heading: string): string {
  const trimmed = heading.trim();
  if (trimmed) return trimmed;
  return kind === 'domestic' ? DEFAULT_DOMESTIC_LABEL : DEFAULT_INTL_LABEL;
}

export function bankBlocksFor(
  country: string | null | undefined,
  accounts: BankAccountsSettings,
): BankBlock[] {
  const kinds = visibleBankKinds(bankAudienceFor(country), accounts.intlEnabled);
  return kinds.map((kind) => {
    const account = kind === 'domestic' ? accounts.domestic : accounts.international;
    return {
      kind,
      heading: labelledHeading(kind, account.heading),
      rows: rowsFor(kind, account),
      note: account.note,
    };
  });
}

export function bankBlocksFromSettings(
  country: string | null | undefined,
  settings: Record<string, string>,
): BankBlock[] {
  return bankBlocksFor(country, accountsFromSettings(settings));
}

/** Plain-text payment section used by tests and as the PDF line source. */
export function formatBankBlocksText(
  blocks: BankBlock[],
  paymentReference?: string,
): string {
  const parts: string[] = [];
  for (const block of blocks) {
    parts.push(block.heading);
    for (const row of block.rows) {
      parts.push(`${row.label}: ${row.value}`);
    }
    if (block.note) parts.push(block.note);
  }
  if (paymentReference) {
    parts.push(`Use ${paymentReference} as your payment reference.`);
  }
  return parts.join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** HTML fragment for print templates. Headings are always present. */
export function bankBlocksHtml(blocks: BankBlock[], paymentReference: string): string {
  const sections = blocks
    .map((block) => {
      const rows = block.rows
        .map(
          (row) =>
            `<div><strong>${escapeHtml(row.label)}:</strong> ${escapeHtml(row.value)}</div>`,
        )
        .join('');
      const note = block.note
        ? `<p style="margin:8px 0 0 0;color:#666;font-size:12px;">${escapeHtml(block.note)}</p>`
        : '';
      return `<div class="bank-block" style="margin-bottom:14px;">
        <div class="bank-heading" style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#C4A35A;margin-bottom:6px;">${escapeHtml(block.heading)}</div>
        ${rows}
        ${note}
      </div>`;
    })
    .join('');
  return `${sections}<p style="margin:8px 0 0 0;font-size:12px;">Use <strong>${escapeHtml(paymentReference)}</strong> as your payment reference.</p>`;
}
