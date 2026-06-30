import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToAuthDeepLinks } from '@/lib/auth/deepLink';
import { useAuthStore } from '@/stores/authStore';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const refresh = useAuthStore((s) => s.refresh);
  const { updatePassword, isLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    void refresh().then(() => setSessionReady(true));
    return subscribeToAuthDeepLinks(() => {
      void refresh().then(() => setSessionReady(true));
    });
  }, [refresh]);

  async function onSubmit() {
    setError(null);
    let valid = true;
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      valid = false;
    } else {
      setPasswordError(undefined);
    }
    if (password !== confirm) {
      setConfirmError('Passwords do not match');
      valid = false;
    } else {
      setConfirmError(undefined);
    }
    if (!valid) return;

    try {
      await updatePassword(password);
      router.replace({
        pathname: '/(public)/login',
        params: { message: 'Password updated successfully' },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update password.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#111008' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer keyboardShouldPersistTaps="handled" className="bg-[#111008]">
        <View className="px-6 pt-16">
          <Typography variant="display">New Password</Typography>
          <Typography variant="bodyMuted" className="mb-8 mt-2">
            Choose a strong password for your account.
          </Typography>

          {!sessionReady ? (
            <Typography variant="caption" className="text-muted">
              Verifying reset link…
            </Typography>
          ) : (
            <>
          <Input
            label="New Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            error={passwordError}
          />
          <Input
            label="Confirm Password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="••••••••"
            secureTextEntry
            error={confirmError}
          />

          {error ? (
            <Typography variant="caption" className="mb-3 text-danger">
              {error}
            </Typography>
          ) : null}

          <Button
            label="Update Password"
            variant="solid"
            onPress={() => void onSubmit()}
            loading={isLoading}
            disabled={isLoading || !sessionReady}
            fullWidth
          />
            </>
          )}
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
