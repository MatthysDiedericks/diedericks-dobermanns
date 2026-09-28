# Cursor Prompt — A second bank account for SADC and international clients

## Do this first

1. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
2. `npx tsc --noEmit` in both when done. Paste the real output.

**The settings are already loaded — I did that.** Do not re-enter them. This is the rendering and the
admin screen only.

---

## What exists now

`quotes` has **no** bank columns — only `currency`. Bank details are read live from `app_settings` at
render time, so every existing quote picks up a template change automatically. **There is no data
migration in this job**, and there must not be one.

Two sets of keys now exist in `app_settings`:

| domestic (unchanged) | international / SADC (new) |
|---|---|
| `bank_account_name` MR M DIEDERICKS | `bank_intl_account_name` MATTHYS DIEDERICKS |
| `bank_account_number` 27 311 907 9 | `bank_intl_account_number` 16916528231 |
| `bank_name` Standard Bank | `bank_intl_bank_name` Discovery Bank |
| `bank_branch_code` 2749 | `bank_intl_branch_code` 679000 |
| `bank_swift` SBZAZAJJ | `bank_intl_swift` DISCZAJJXXX |
| `bank_address` | `bank_intl_address`, `bank_intl_branch_name`, `bank_intl_account_type` |
| `bank_account_note` | `bank_intl_note` |
| `bank_domestic_label` "South African clients" | `bank_intl_label` "International & SADC clients" |

`bank_intl_enabled` is `true` and is the master switch.

## Who gets which

From the live contacts table: **South Africa 136, Swaziland 106, Namibia 4, Zambia 2, blank 27.** The
non-SA group is not an edge case — it is nearly half the book, and Eswatini is the second-biggest
market.

Add `src/lib/finance/bankDetails.ts`, one function, used by every template:

```ts
export type BankAudience = "domestic" | "international" | "both";

/**
 * South Africa pays Standard Bank. Everyone else pays the Discovery account.
 * A client with no country on file gets BOTH, clearly labelled — guessing wrong
 * sends a client's money to the wrong bank, which is worse than showing two.
 */
export function bankAudienceFor(country: string | null | undefined): BankAudience
```

- `South Africa`, `ZA`, `RSA`, blank-after-trim-but-explicitly-SA → `domestic`
- any other non-empty country → `international`
- null, empty or whitespace → `both`

Match case-insensitively and trim. `Swaziland` and `Eswatini` are the same country — both are
`international`.

## Where it must appear

Everywhere a client is told how to pay:

- the quote PDF and the on-screen quote
- the invoice PDF
- the client portal payment panel
- the Expo app's equivalents

Render as a labelled block — the label from `bank_domestic_label` / `bank_intl_label` — showing
account name, bank, account number, branch code, SWIFT, and for the international block the bank
address too, because most foreign banks require it on a wire. Put the matching `note` under it.

When the audience is `both`, show two blocks in that order with the headings visible. **Never show two
unlabelled account numbers.**

### The address changes too, and this is not cosmetic

```
contact_address                 302 Usutu Drive, H115 Mhlambanyatsi, Eswatini
bank_intl_beneficiary_address   43 Waverley Green Complex, Honeysuckle Crescent,
                                West Acres, Nelspruit 1200, South Africa
```

The kennel's address on file is in **Eswatini**; the bank account is in **South Africa**. A foreign
bank sending a wire needs the beneficiary's address to sit in the same country as the account, or the
payment gets held for compliance questions. So for an international or SADC client:

- render `bank_intl_beneficiary_address` inside the international bank block, labelled
  **Beneficiary address**
- and use it in place of `contact_address` in the document header for that client

`contact_address` is unchanged and stays exactly as-is for South African clients and everywhere else
in the app — the kennel is still in Eswatini. This substitution applies only when
`bankAudienceFor` returns `international`.

When the audience is `both`, show `contact_address` in the header and put the beneficiary address
inside the international block only.

## Admin screen

Add the international fields to the existing banking section in admin settings, beside the current
ones, with `bank_intl_enabled` as a switch that hides the whole block when off. Same validation as
the existing fields. Matt must be able to change these without a developer.

## Two things that must not happen

**1. The ID number never renders.** The bank letter this came from carries Matt's South African ID
number. It is deliberately *not* in `app_settings` and it must never be added to any setting,
template, PDF or email. If you see it anywhere in the codebase, tell me.

**2. The account type is shown, not hidden.** `bank_intl_account_type` is `Gold Credit Card`. Render
it in the international block as **Account type**. A foreign bank filling in a wire needs to know,
and hiding it is how a payment gets rejected with nobody knowing why.

## Tests

- `bankAudienceFor` → South Africa `domestic`; Eswatini, Swaziland, Namibia, Zambia, Germany, United
  States all `international`; null, `""`, `"   "` all `both`
- Case and whitespace do not change the answer
- `bank_intl_enabled = false` → the international block disappears and a non-SA client sees the
  domestic block only
- A rendered quote for an Eswatini client contains `16916528231` and does **not** contain
  `27 311 907 9`
- A rendered quote for a Namibian client shows the Nelspruit beneficiary address and **not**
  `Mhlambanyatsi`
- A rendered quote for a South African client still shows `Mhlambanyatsi` and never shows the
  Nelspruit address
- No template output contains the string `8204015111081`

---

## Do not

- Do not add bank columns to `quotes` or `invoices`, and do not snapshot bank details onto existing
  rows. They render live; that is the design.
- Do not re-enter or edit the `app_settings` values.
- Do not put the ID number anywhere.
- Do not show two account blocks without headings.
- Do not create test quotes, invoices or contacts in production.

---

## Report

1. `bankDetails.ts` and its tests.
2. A rendered quote for a South African client and one for an Eswatini client, side by side.
3. A rendered quote for a contact with no country, showing both blocks labelled.
4. The admin settings screen with the new fields.
5. A grep proving `8204015111081` appears nowhere in either repo.
6. `npx tsc --noEmit` clean in both repos.
