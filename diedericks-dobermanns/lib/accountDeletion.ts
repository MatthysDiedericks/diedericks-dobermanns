import { Linking } from 'react-native';

import { LEGAL_URLS } from '@/lib/legalUrls';

/** Opens a pre-filled email to request account deletion (POPIA right to erasure). */
export function openAccountDeletionRequest(): void {
  const subject = encodeURIComponent('Account Deletion Request');
  const body = encodeURIComponent(
    'Please delete my Diedericks Dobermanns app account and associated personal data.\n\n' +
      'Registered email:\n\n' +
      'Reason (optional):\n',
  );
  void Linking.openURL(
    `mailto:${LEGAL_URLS.contactEmail}?subject=${subject}&body=${body}`,
  );
}
