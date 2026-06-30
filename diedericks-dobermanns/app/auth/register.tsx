import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { SignUpLegalNotice } from '@/components/legal/LegalLinksRow';
import { BrandMark } from '@/components/layout/BrandMark';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { signUpWithEmail } from '@/lib/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onRegister() {
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const { error: err } = await signUpWithEmail(email.trim(), password, fullName.trim());
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center px-8">
        <Typography variant="display" className="text-center">
          Check Your Email
        </Typography>
        <Typography variant="bodyMuted" className="mt-3 text-center">
          We&apos;ve sent a verification link to {email}. Verify your email, then sign in.
        </Typography>
        <Button
          label="Back to Sign In"
          onPress={() => router.replace('/auth/login')}
          className="mt-8"
        />
      </ScreenContainer>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <View className="px-6 pt-10">
          <BrandMark size="lg" />
          <Typography variant="display" className="mt-10">
            Create Account
          </Typography>
          <Typography variant="bodyMuted" className="mb-8 mt-2">
            Register to apply and track your reservation.
          </Typography>

          <Input label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your name" autoCapitalize="words" />
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry />

          {error ? (
            <Typography variant="caption" className="mb-3 text-danger">
              {error}
            </Typography>
          ) : null}

          <Button label="Create Account" onPress={onRegister} loading={loading} fullWidth />

          <SignUpLegalNotice />

          <View className="mt-6 flex-row justify-center">
            <Typography variant="bodyMuted">Already registered? </Typography>
            <Link href="/auth/login" asChild>
              <Typography variant="label">Sign in</Typography>
            </Link>
          </View>
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
