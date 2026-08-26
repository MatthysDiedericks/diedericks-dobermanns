import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { AuthBackButton } from '@/components/auth/AuthBackButton';
import { LoginLogo } from '@/components/auth/LoginLogo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useAuth } from '@/hooks/useAuth';

// 60s matches the "up to a minute to arrive" messaging below — stops users
// requesting a second code (invalidating the first) before the original lands.
const RESEND_COOLDOWN_SECS = 60;
const WRONG_CODE_MESSAGE = "That code isn't right — check your email and try again.";

function friendlyVerifyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('already been used') || (m.includes('used') && !m.includes('expired'))) {
    return 'This link has already been used — ask Matt for a new one.';
  }
  if (m.includes('expired')) {
    return 'This link has expired. Ask Matt for a new one.';
  }
  return WRONG_CODE_MESSAGE;
}

export default function VerifyCodeScreen() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = typeof emailParam === 'string' ? emailParam : '';
  const { verifyOtp, resendOtp, isLoading } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function onVerify() {
    setError(null);
    setInfo(null);
    // Supabase OTP codes are 6 digits by default but can be 8 depending on
    // project config — observed live 2026-07-22: an 8-digit code was sent.
    if (code.trim().length < 6) {
      setError('Enter the code from your email.');
      return;
    }
    try {
      await verifyOtp(email, code.trim());
      // Session is now set — AuthNavigationSync (root layout) takes it from here.
    } catch (e) {
      setError(e instanceof Error ? friendlyVerifyError(e.message) : WRONG_CODE_MESSAGE);
    }
  }

  async function onResend() {
    if (cooldown > 0 || resending) return;
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      await resendOtp(email);
      setCooldown(RESEND_COOLDOWN_SECS);
      setInfo('A new code is on its way.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend the code. Please try again.');
    } finally {
      setResending(false);
    }
  }

  if (!email) {
    return (
      <ScreenContainer scroll={false} className="px-8">
        <View className="mt-4 self-start">
          <AuthBackButton />
        </View>
        <View className="flex-1 items-center justify-center">
        <Typography variant="display" className="text-center">
          Missing Email
        </Typography>
        <Typography variant="bodyMuted" className="mt-3 text-center">
          We couldn&apos;t tell which account to verify. Please sign up again.
        </Typography>
        <Button label="Back to Sign Up" onPress={() => router.replace('/(public)/sign-up')} className="mt-8" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#111008' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer keyboardShouldPersistTaps="handled" className="bg-[#111008]">
        <View className="px-6 pt-16">
          <AuthBackButton />
          <LoginLogo />

          <Typography variant="display" className="mt-10">
            Verify Your Email
          </Typography>
          <Typography variant="bodyMuted" className="mb-2 mt-2">
            We sent a verification code to {email}. Enter it below to confirm your account.
          </Typography>
          <Typography variant="caption" className="mb-8 text-subtle">
            Stuck after a WhatsApp link? Enter the 6-digit code Matt sent. Opened from
            WhatsApp? Tap ⋯ and choose Open in browser.
          </Typography>

          <Input
            label="VERIFICATION CODE"
            value={code}
            onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 8))}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={8}
            autoFocus
            className="text-center text-2xl tracking-[0.5em]"
          />

          {error ? (
            <View className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <Typography variant="caption" className="text-red-400">
                {error}
              </Typography>
            </View>
          ) : null}
          {info ? (
            <View className="mb-4 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
              <Typography variant="caption" className="text-gold">
                {info}
              </Typography>
            </View>
          ) : null}

          <Button
            label={isLoading ? 'Verifying…' : 'Verify'}
            onPress={onVerify}
            variant="solid"
            fullWidth
            disabled={isLoading || code.length < 6}
            className="mt-2"
          />

          <Pressable
            onPress={onResend}
            disabled={cooldown > 0 || resending}
            className="mt-6 items-center"
          >
            <Typography variant="label" className={cooldown > 0 ? 'text-subtle' : 'text-gold'}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : resending ? 'Sending…' : 'Resend code'}
            </Typography>
          </Pressable>

          <Pressable onPress={() => router.replace('/(public)/login')} className="mt-6 items-center">
            <Typography variant="caption" className="text-subtle">
              Wrong email? Back to Sign In
            </Typography>
          </Pressable>
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
