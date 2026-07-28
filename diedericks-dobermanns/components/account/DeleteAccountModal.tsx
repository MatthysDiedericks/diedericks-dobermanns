import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { deleteOwnAccount, openAccountDeletionRequest } from '@/lib/accountDeletion';
import { LEGAL_URLS } from '@/lib/legalUrls';

const CONFIRM_WORD = 'DELETE';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called once the account has been successfully deleted server-side. */
  onDeleted: () => void;
}

/**
 * Two-step, in-app account deletion confirmation (Apple 5.1.1(v) / Google
 * Play requirement — a "contact us" email is not sufficient as the primary
 * path). Step 1 explains what is erased vs retained; step 2 requires typing
 * "DELETE" before the destructive call fires.
 */
export function DeleteAccountModal({ visible, onClose, onDeleted }: DeleteAccountModalProps) {
  const [step, setStep] = useState<'explain' | 'confirm'>('explain');
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep('explain');
    setConfirmText('');
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleDelete() {
    setSubmitting(true);
    setError(null);
    try {
      const { error: err } = await deleteOwnAccount();
      if (err) {
        setError(err);
        return;
      }
      reset();
      onDeleted();
    } finally {
      setSubmitting(false);
    }
  }

  const canConfirm = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  return (
    <Modal visible={visible} onClose={handleClose} title="Delete Your Account">
      {step === 'explain' ? (
        <View>
          <Typography variant="bodyMuted">
            This action is permanent. Your personal information (profile, contact details,
            documents) will be erased and cannot be recovered.
          </Typography>
          <Typography variant="bodyMuted" className="mt-3">
            Records of purchases, contracts, and other transactions are retained as required by
            law — see our{' '}
            <Typography
              variant="bodyMuted"
              className="text-gold underline"
              onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.privacyPolicy)}
            >
              Privacy Policy
            </Typography>
            .
          </Typography>

          <View className="mt-6 flex-row gap-3">
            <Button label="Cancel" variant="outline" onPress={handleClose} className="flex-1" />
            <Button
              label="Continue"
              variant="danger"
              onPress={() => setStep('confirm')}
              className="flex-1"
            />
          </View>

          <Pressable onPress={openAccountDeletionRequest} className="mt-4 items-center">
            <Typography variant="caption" className="text-subtle underline">
              Trouble deleting? Email us instead
            </Typography>
          </Pressable>
        </View>
      ) : (
        <View>
          <Typography variant="bodyMuted">
            Type <Typography variant="bodyMuted" className="text-gold">DELETE</Typography> below to
            confirm.
          </Typography>
          <Input
            autoCapitalize="characters"
            autoCorrect={false}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="DELETE"
            containerClassName="mt-4 mb-0"
          />
          {error ? (
            <Typography variant="caption" className="mt-3 text-danger">
              {error}
            </Typography>
          ) : null}

          <View className="mt-6 flex-row gap-3">
            <Button
              label="Cancel"
              variant="outline"
              onPress={handleClose}
              className="flex-1"
              disabled={submitting}
            />
            <Button
              label="Delete My Account"
              variant="danger"
              onPress={() => void handleDelete()}
              className="flex-1"
              disabled={!canConfirm}
              loading={submitting}
            />
          </View>
        </View>
      )}
    </Modal>
  );
}
