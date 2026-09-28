export const EXPIRING_KINDS = [
  "document",
  "vaccination",
  "deworming",
  "contract",
  "invite",
  "quote",
  "payable",
] as const;

export type ExpiringKind = (typeof EXPIRING_KINDS)[number];

/** Documents are 30 on purpose. A kennel registration cannot be renewed in a week. */
export const SEEDED_LEAD_DAYS: Record<ExpiringKind, number> = {
  document: 30,
  vaccination: 7,
  deworming: 7,
  contract: 3,
  invite: 3,
  quote: 7,
  payable: 7,
};

export const LEAD_SETTING_KEY: Record<ExpiringKind, string> = {
  document: "alert_lead_days_document",
  vaccination: "alert_lead_days_vaccination",
  deworming: "alert_lead_days_deworming",
  contract: "alert_lead_days_contract",
  invite: "alert_lead_days_invite",
  quote: "alert_lead_days_quote",
  payable: "alert_lead_days_payable",
};

export const LEAD_SETTING_LABEL: Record<ExpiringKind, string> = {
  document: "Documents (days)",
  vaccination: "Vaccinations (days)",
  deworming: "Deworming (days)",
  contract: "Contract e-sign links (days)",
  invite: "Portal invites (days)",
  quote: "Quotes (days)",
  payable: "Unpaid bills (days)",
};
