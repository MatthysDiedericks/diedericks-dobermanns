import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onForgotPassword: () => void;
  loading?: boolean;
  serverError?: string | null;
}

function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address';
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return undefined;
}

export function LoginForm({
  onSubmit,
  onForgotPassword,
  loading = false,
  serverError,
}: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  async function handleSubmit() {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;
    await onSubmit(email, password);
  }

  return (
    <View>
      {serverError ? (
        <View className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <Typography variant="caption" className="text-amber-200">
            {serverError}
          </Typography>
        </View>
      ) : null}

      <Input
        label="Email"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (emailError) setEmailError(validateEmail(v));
        }}
        placeholder="you@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={emailError}
      />

      <View className="relative mb-4">
        <Input
          label="Password"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (passwordError) setPasswordError(validatePassword(v));
          }}
          placeholder="••••••••"
          secureTextEntry={!showPassword}
          autoComplete="password"
          error={passwordError}
          containerClassName="mb-0"
        />
        <Pressable
          onPress={() => setShowPassword((s) => !s)}
          className="absolute right-3 top-9 h-10 w-10 items-center justify-center"
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={Colors.silver}
          />
        </Pressable>
      </View>

      <Button
        label="Sign In"
        variant="solid"
        onPress={() => void handleSubmit()}
        loading={loading}
        disabled={loading}
        fullWidth
      />

      <Pressable onPress={onForgotPassword} className="mt-5 items-center">
        <Typography variant="label">Forgot password?</Typography>
      </Pressable>
    </View>
  );
}
