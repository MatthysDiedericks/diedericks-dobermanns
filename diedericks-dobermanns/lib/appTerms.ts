/**
 * App Terms & Conditions — source of truth for the in-app Terms screen.
 * Keep in sync with ../LEGAL/TermsAndConditions.md and the published website page.
 *
 * For puppy purchase terms, see lib/legal.ts (Terms & Conditions of Sale).
 */

import { LEGAL_URLS } from '@/lib/legalUrls';

export const APP_TERMS_META = {
  effectiveDate: '26 June 2026',
  lastUpdated: '26 June 2026',
  application: 'Diedericks Dobermanns App',
  bundleId: 'com.diedericksdobermanns.app',
  operator: 'Diedericks Dobermanns',
  contactEmail: 'info@diedericksdobermanns.com',
} as const;

export interface AppTermsSection {
  title: string;
  body: string;
}

export const APP_TERMS_SECTIONS: AppTermsSection[] = [
  {
    title: '1. Acceptance of Terms',
    body:
      'By downloading, installing, or using the Diedericks Dobermanns mobile application ("the App"), you ("the User") agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, do not use the App.\n\n' +
      'These Terms constitute a legally binding agreement between you and Diedericks Dobermanns ("we", "us", "our").',
  },
  {
    title: '2. Description of Service',
    body:
      'The Diedericks Dobermanns App is a private client platform that provides:\n\n' +
      '• Information about available puppies, expected litters, and dogs currently in training\n' +
      '• Online puppy reservation and application processing\n' +
      '• Training booking and scheduling\n' +
      '• Training video library (free and paid content)\n' +
      '• Client profile management\n' +
      '• Document upload and storage\n' +
      '• Push notification services\n' +
      '• Communication with Diedericks Dobermanns staff\n\n' +
      'The App is not a public marketplace. Access to the client area requires registration and approval by Diedericks Dobermanns.',
  },
  {
    title: '3. User Accounts and Registration',
    body:
      '3.1 Eligibility\nYou must be at least 18 years of age to create an account and use the App. By registering, you confirm that you are 18 or older.\n\n' +
      '3.2 Account Accuracy\nYou agree to provide accurate, current, and complete information during registration and to update it promptly if it changes. Providing false information may result in immediate account termination.\n\n' +
      '3.3 Account Security\nYou are responsible for maintaining the confidentiality of your login credentials. You agree to notify us immediately at info@diedericksdobermanns.com if you suspect any unauthorised use of your account.\n\n' +
      '3.4 One Account Per Person\nEach person may hold only one registered account. Creating multiple accounts is prohibited and may result in all accounts being terminated.',
  },
  {
    title: '4. Puppy Reservations and Applications',
    body:
      '4.1 Application Process\nSubmitting an application through the App does not guarantee the sale of a puppy. All applications are reviewed by Diedericks Dobermanns, and we reserve the right to accept or decline any application at our sole discretion without being required to provide a reason.\n\n' +
      '4.2 Reservation Deposits\nWhere a reservation deposit is required, payment terms and conditions will be communicated separately. Deposit amounts and refund policies are governed by the separate Puppy Purchase Agreement, not these Terms.\n\n' +
      '4.3 Waiting Lists\nBeing placed on a waiting list does not constitute a binding commitment by either party. We will notify waiting list members in order when puppies become available.\n\n' +
      '4.4 No Guarantee of Availability\nAvailability of puppies shown in the App may change without notice due to reservations, health factors, or other circumstances.',
  },
  {
    title: '5. Training Services',
    body:
      '5.1 Training Bookings\nTraining bookings made through the App are subject to availability and confirmation by Diedericks Dobermanns. A booking is only confirmed once you receive written confirmation.\n\n' +
      '5.2 Cancellations and Rescheduling\nCancellation and rescheduling policies for training sessions will be communicated at the time of booking. Failure to attend without sufficient notice may result in a forfeiture of the session fee.\n\n' +
      '5.3 Training Video Library\nAccess to the training video library is provided as follows:\n\n' +
      '• Free tier: Available to all registered clients who have purchased a puppy from Diedericks Dobermanns\n' +
      '• Bundle tier: Premium video bundles require separate purchase. Purchased bundles are non-refundable once accessed.\n' +
      '• Content: Training videos are provided for informational and guidance purposes only. Results may vary based on the individual dog, training consistency, and handler skill. Videos do not replace professional in-person training for complex behaviour modification.',
  },
  {
    title: '6. Acceptable Use',
    body:
      'You agree that you will NOT:\n\n' +
      '• Use the App for any unlawful purpose\n' +
      '• Share your account credentials with any other person\n' +
      '• Attempt to gain unauthorised access to other accounts, the database, or any connected systems\n' +
      '• Reverse engineer, decompile, or disassemble the App or any part of it\n' +
      "• Upload content that is defamatory, obscene, threatening, or that infringes any third party's rights\n" +
      '• Use the App to harass, stalk, or harm any person\n' +
      '• Attempt to circumvent any security measures, payment systems, or access controls\n' +
      '• Upload files containing viruses, malware, or other harmful code\n' +
      '• Use automated tools, bots, or scrapers to access or extract data from the App\n\n' +
      'Violation of these terms may result in immediate account suspension or termination and may be referred to law enforcement authorities.',
  },
  {
    title: '7. User-Generated Content',
    body:
      '7.1 Your Content\nYou retain ownership of content you upload (photos, documents, messages). By uploading content, you grant Diedericks Dobermanns a non-exclusive, royalty-free licence to store, display, and use that content for the purpose of providing the service.\n\n' +
      '7.2 Content Standards\nYou confirm that any content you upload:\n' +
      '• Is your original work or you have the right to share it\n' +
      '• Does not infringe any copyright, trademark, or other intellectual property right\n' +
      '• Does not contain personal information about third parties without their consent\n' +
      '• Is not fraudulent, misleading, or false\n\n' +
      '7.3 Removal of Content\nWe reserve the right to remove any user-uploaded content that violates these Terms or that we consider inappropriate, without notice.',
  },
  {
    title: '8. Intellectual Property',
    body:
      'All content within the App, including but not limited to text, photographs, videos, logos, brand assets, training methodologies, and software, is the property of Diedericks Dobermanns or its licensors and is protected by South African and international copyright law.\n\n' +
      'You may not copy, reproduce, distribute, modify, create derivative works from, or commercially exploit any content from the App without our prior written consent.',
  },
  {
    title: '9. Privacy',
    body:
      'Your use of the App is governed by our Privacy Policy, which is incorporated into these Terms by reference. By accepting these Terms, you also accept our Privacy Policy. Please read it carefully at:\n\n' +
      LEGAL_URLS.privacyPolicy,
  },
  {
    title: '10. Push Notifications',
    body:
      'By creating an account and enabling notifications, you consent to receiving push notifications from Diedericks Dobermanns. You may withdraw this consent at any time through your device settings.',
  },
  {
    title: '11. Payments and Refunds',
    body:
      '11.1 Payment Processing\nWhere payments are processed through the App (training video bundles, reservation deposits), all transactions are processed through secure payment providers. We do not store card details.\n\n' +
      '11.2 Video Bundles\nAll video bundle purchases are final and non-refundable once the content has been accessed.\n\n' +
      '11.3 Disputes\nIf you believe a charge was made in error, contact us within 30 days of the transaction at info@diedericksdobermanns.com with your order reference.',
  },
  {
    title: '12. Disclaimers and Limitation of Liability',
    body:
      '12.1 No Warranty\nThe App is provided "as is" and "as available." We make no warranty that the App will be uninterrupted, error-free, or free of viruses. We may modify, suspend, or discontinue any part of the App without notice.\n\n' +
      '12.2 Training Advice\nTraining guidance provided through the App (including training videos) is for informational purposes only. We are not liable for any injury to persons or animals resulting from the application of training techniques shown in the App. Always exercise appropriate caution and supervise all interactions between dogs and people, especially children.\n\n' +
      '12.3 Limitation of Liability\nTo the maximum extent permitted by South African law, Diedericks Dobermanns shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App, even if we have been advised of the possibility of such damages.\n\n' +
      'Our total liability to you for any claim arising from these Terms or your use of the App shall not exceed the amount you paid to us in the 12 months preceding the claim.',
  },
  {
    title: '13. Indemnification',
    body:
      "You agree to indemnify and hold harmless Diedericks Dobermanns, its owners, employees, and agents from any claims, damages, losses, or expenses (including legal fees) arising from:\n\n" +
      '• Your use of the App\n' +
      '• Your violation of these Terms\n' +
      "• Your violation of any third party's rights\n" +
      '• Any content you upload to the App',
  },
  {
    title: '14. Termination',
    body:
      '14.1 By You\nYou may delete your account at any time by contacting us at info@diedericksdobermanns.com. Upon deletion, your personal data will be handled as described in our Privacy Policy.\n\n' +
      '14.2 By Us\nWe reserve the right to suspend or terminate your account immediately and without notice if:\n' +
      '• You breach these Terms\n' +
      '• We suspect fraudulent activity\n' +
      '• We are required to do so by law\n' +
      '• We discontinue the App\n\n' +
      'Termination does not affect any rights or obligations accrued prior to termination.',
  },
  {
    title: '15. Changes to These Terms',
    body:
      'We may update these Terms at any time. We will notify you of significant changes through the App or by email. Your continued use of the App after the notification period constitutes acceptance of the updated Terms. If you do not agree to the changes, you must stop using the App.',
  },
  {
    title: '16. Governing Law and Dispute Resolution',
    body:
      'These Terms are governed by the laws of the Republic of South Africa. Any disputes shall be subject to the jurisdiction of the South African courts.\n\n' +
      'We encourage you to contact us first to resolve any dispute informally. If we cannot resolve a dispute within 30 days, either party may pursue legal remedies.',
  },
  {
    title: '17. Severability',
    body:
      'If any provision of these Terms is found to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect.',
  },
  {
    title: '18. Entire Agreement',
    body:
      'These Terms, together with our Privacy Policy, constitute the entire agreement between you and Diedericks Dobermanns regarding your use of the App and supersede all prior agreements.',
  },
  {
    title: '19. Contact Us',
    body:
      'For any questions about these Terms, contact:\n\n' +
      'Diedericks Dobermanns\n' +
      'Email: info@diedericksdobermanns.com\n' +
      'Website: www.diedericksdobermanns.com\n\n' +
      'Subject line: "TERMS ENQUIRY"\n\n' +
      'These Terms and Conditions are governed by the laws of the Republic of South Africa.',
  },
];
