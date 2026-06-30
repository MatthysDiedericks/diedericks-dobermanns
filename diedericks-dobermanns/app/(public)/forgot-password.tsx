import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useAuth } from '@/hooks/useAuth';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { sendPasswordReset, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Enter a valid email address');
      return;
    }
    setEmailError(undefined);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send reset link.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#111008' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer keyboardShouldPersistTaps="handled" className="bg-[#111008]">
        <View className="px-6 pt-16">
          <Typography variant="display">Reset Password</Typography>
          <Typography variant="bodyMuted" className="mb-8 mt-2">
            Enter your email and we&apos;ll send a secure reset link.
          </Typography>

          {sent ? (
            <View className="rounded-xl border border-gold/30 bg-gold/5 px-4 py-5">
              <Typography variant="body" className="text-gold">
                Check your email — a reset link has been sent.
              </Typography>
              <Typography variant="caption" className="mt-2 text-muted">
                If an account exists for {email}, follow the link to choose a new
                password.
              </Typography>
            </View>
          ) : (
            <>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={emailError}
              />
              {error ? (
                <Typography variant="caption" className="mb-3 text-danger">
                  {error}
                </Typography>
              ) : null}
              <Button
                label="Send Reset Link"
                variant="solid"
                onPress={() => void onSubmit()}
                loading={isLoading}
                disabled={isLoading}
                fullWidth
              />
            </>
          )}

          <Button
            label="Back to Sign In"
            variant="ghost"
            onPress={() => router.replace('/(public)/login')}
            className="mt-6"
          />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
