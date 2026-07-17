/** South Africa's 9 provinces, for the application form's province dropdown. */
export const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
] as const;

/**
 * Country list for the application form's country dropdown. South Africa is
 * first and is the default selection. The rest covers Diedericks Dobermanns'
 * realistic client base — Southern Africa, then other regions alphabetically
 * — plus a trailing "Other" so no genuine applicant is ever blocked.
 */
export const COUNTRIES = [
  'South Africa',
  'Eswatini',
  'Botswana',
  'Namibia',
  'Lesotho',
  'Mozambique',
  'Zimbabwe',
  'Zambia',
  'Australia',
  'Belgium',
  'Canada',
  'France',
  'Germany',
  'Ireland',
  'Italy',
  'Netherlands',
  'New Zealand',
  'Portugal',
  'Spain',
  'Switzerland',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Other',
] as const;
