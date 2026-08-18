/** Consent copy and source names. Keep in lockstep with
 *  diedericksdobermann-web/src/lib/marketing/sources.ts */

export const MARKETING_CONSENT_LABEL =
  'Send me news about upcoming litters and training.';

export const MARKETING_SOURCES = {
  applicationForm: 'application_form',
  portalProfile: 'portal_profile',
  newsletterSignup: 'newsletter_signup',
  quoteAcceptance: 'quote_acceptance',
} as const;

export type MarketingSource = (typeof MARKETING_SOURCES)[keyof typeof MARKETING_SOURCES];
