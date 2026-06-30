/**
 * POPIA-compliant Privacy Policy — source of truth for the in-app Privacy Policy screen.
 * Keep in sync with ../LEGAL/PrivacyPolicy.md and the published website page.
 */

export const PRIVACY_META = {
  effectiveDate: '26 June 2026',
  lastUpdated: '26 June 2026',
  application: 'Diedericks Dobermanns App',
  bundleId: 'com.diedericksdobermanns.app',
  operator: 'Diedericks Dobermanns',
  contactEmail: 'info@diedericksdobermanns.com',
} as const;

export interface PrivacySection {
  title: string;
  body: string;
}

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    title: '1. Introduction',
    body:
      'Diedericks Dobermanns ("we", "us", "our") is committed to protecting your personal information in accordance with the Protection of Personal Information Act 4 of 2013 (POPIA) of the Republic of South Africa, and applicable international data protection standards.\n\n' +
      'This Privacy Policy explains how we collect, use, store, share, and protect personal information when you use the Diedericks Dobermanns mobile application ("the App").\n\n' +
      'By using the App, you acknowledge that you have read and understood this Privacy Policy and consent to the processing of your personal information as described herein.',
  },
  {
    title: '2. Information We Collect',
    body:
      '2.1 Information You Provide Directly\n\n' +
      '• Account information: Full name, email address, phone number, WhatsApp number\n' +
      '• Profile information: Residential address, city, country\n' +
      '• Application data: Dog ownership experience, current pets, home environment details, property type, fencing details, purpose of purchase\n' +
      '• Veterinary information: Name of veterinarian, practice name, contact number\n' +
      '• Emergency contact: Name, relationship, and contact number of emergency contact\n' +
      '• Documents: Uploaded documents such as identification, references, or veterinary records\n' +
      '• Payment information: We do not store card details. Payment references only.\n' +
      '• Communications: Messages, training notes, and enquiry submissions\n\n' +
      '2.2 Information Collected Automatically\n\n' +
      '• Device information: Device model, operating system, app version\n' +
      '• Usage data: Screens visited, features used, session duration\n' +
      '• Crash reports: Error logs to improve app stability (anonymised)\n\n' +
      '2.3 Photos and Media\n\n' +
      'With your explicit permission, we access your device camera and photo library to allow you to upload photos of your dogs, documents, and profile pictures. We do not access your media without permission.',
  },
  {
    title: '3. How We Use Your Information',
    body:
      'We use your personal information to:\n\n' +
      '• Provide the service: Create and manage your client account, process puppy reservations and applications\n' +
      '• Training management: Record training bookings, session notes, and progress tracking\n' +
      '• Health records: Store vaccination schedules, veterinary records, and health documents for your dog\n' +
      '• Communication: Send booking confirmations, training updates, and important notifications\n' +
      '• Administration: Process applications, manage waiting lists, and generate contracts\n' +
      '• Security: Verify identity and prevent unauthorised access\n' +
      '• Improvement: Analyse usage to improve the App experience\n' +
      '• Legal compliance: Meet our obligations under applicable law\n\n' +
      'We will not use your information for unsolicited marketing without your explicit opt-in consent.',
  },
  {
    title: '4. Legal Basis for Processing (POPIA)',
    body:
      'We process your personal information under the following conditions:\n\n' +
      '• Contractual necessity: To fulfil our obligations when you purchase a puppy or book training\n' +
      '• Legitimate interests: To operate, secure, and improve our services\n' +
      '• Consent: For optional marketing communications (you may withdraw at any time)\n' +
      '• Legal obligation: Where required by South African law',
  },
  {
    title: '5. Data Storage and Security',
    body:
      '5.1 Where Your Data is Stored\n\n' +
      'Your data is stored on Supabase infrastructure, with servers located in reliable cloud regions. All data is encrypted in transit using TLS 1.2+ and at rest.\n\n' +
      '5.2 Security Measures\n\n' +
      '• Row-Level Security (RLS) on all database tables — you can only access your own data\n' +
      '• JWT authentication with automatic token refresh\n' +
      '• Encrypted local storage for session credentials (Expo SecureStore)\n' +
      '• No service-role keys exposed in the client application\n' +
      '• HTTPS for all API communication\n' +
      '• Role-based access control (Client / Trainer / Administrator / Super Administrator)\n' +
      '• Regular security reviews\n\n' +
      '5.3 Data Retention\n\n' +
      'We retain your personal information for as long as your account is active, required to fulfil the purpose for which it was collected, or required by law (typically 5 years for business records in South Africa).\n\n' +
      'You may request deletion of your account and associated data at any time (see Section 8).',
  },
  {
    title: '6. Sharing of Information',
    body:
      'We do not sell your personal information to third parties.\n\n' +
      'We may share your information with:\n\n' +
      '• Service providers: Supabase (database and authentication infrastructure), Expo (push notifications), Firebase (push notifications). These providers are bound by data processing agreements.\n' +
      '• Trainers: Your name, dog name, and session notes are visible to your assigned trainer\n' +
      '• Legal authorities: Where required by South African law or court order',
  },
  {
    title: "7. Children's Privacy",
    body:
      'This App is not intended for use by children under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal information, please contact us immediately.',
  },
  {
    title: '8. Your Rights Under POPIA',
    body:
      'As a data subject under POPIA, you have the right to:\n\n' +
      '• Access: Request a copy of the personal information we hold about you\n' +
      '• Correction: Request that we correct inaccurate or incomplete information\n' +
      '• Deletion: Request that we delete your personal information (subject to legal retention requirements)\n' +
      '• Objection: Object to the processing of your personal information\n' +
      '• Restriction: Request that we restrict processing in certain circumstances\n' +
      '• Portability: Request your data in a portable format\n' +
      '• Withdraw consent: Withdraw marketing consent at any time without affecting prior processing\n\n' +
      'To exercise any of these rights, contact us at: info@diedericksdobermanns.com\n\n' +
      'We will respond within 30 days of receiving your request.',
  },
  {
    title: '9. Push Notifications',
    body:
      'We send push notifications for:\n' +
      '• Training booking confirmations and reminders\n' +
      '• New puppy availability updates\n' +
      '• Document expiry reminders\n' +
      '• Important administrative messages\n\n' +
      'You may disable push notifications at any time through your device settings. This will not affect your access to the App.',
  },
  {
    title: '10. Third-Party Links',
    body:
      'The App may contain links to external websites or services (such as WhatsApp). We are not responsible for the privacy practices of third parties. We encourage you to review their privacy policies.',
  },
  {
    title: '11. Marketing Communications',
    body:
      'We will only send marketing communications (newsletters, promotions, new litter announcements) if you have explicitly opted in. You may withdraw consent at any time by:\n\n' +
      '• Updating your preferences in the App (Settings → Notifications)\n' +
      '• Emailing us at info@diedericksdobermanns.com with "Unsubscribe" in the subject line',
  },
  {
    title: '12. Changes to This Policy',
    body:
      'We may update this Privacy Policy from time to time. We will notify you of significant changes through the App or by email. Continued use of the App after changes constitutes acceptance of the updated policy.',
  },
  {
    title: '13. Complaints',
    body:
      'If you believe we have not handled your personal information correctly, you may lodge a complaint with the Information Regulator of South Africa:\n\n' +
      '• Website: www.inforegulator.org.za\n' +
      '• Email: inforeg@justice.gov.za\n' +
      '• Address: JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001',
  },
  {
    title: '14. Contact Us',
    body:
      'Diedericks Dobermanns\n' +
      'Email: info@diedericksdobermanns.com\n' +
      'Website: www.diedericksdobermanns.com\n\n' +
      'For privacy-specific enquiries, use the subject line: "PRIVACY ENQUIRY"\n\n' +
      'This Privacy Policy is governed by the laws of the Republic of South Africa.',
  },
];
