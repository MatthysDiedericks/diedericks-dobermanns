import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, TouchableOpacity, View } from 'react-native';

import { AuthBackButton } from '@/components/auth/AuthBackButton';
import { LoginLogo } from '@/components/auth/LoginLogo';
import { LegalLinksRow } from '@/components/legal/LegalLinksRow';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  secure?: boolean;
  showToggle?: boolean;
  visible?: boolean;
  onToggleVisible?: () => void;
  keyboardType?: 'email-address' | 'default';
}

function Field({ label, value, onChange, placeholder, secure, showToggle, visible, onToggleVisible, keyboardType }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View className="mb-4">
      <Typography variant="caption" className="mb-1 text-muted">
        {label}
      </Typography>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: focused ? Colors.gold : 'rgba(196,163,90,0.2)',
          backgroundColor: '#1C1A0E',
          borderRadius: 12,
          paddingHorizontal: 16,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#A09880"
          secureTextEntry={secure && !visible}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            paddingVertical: 12,
            color: '#F5F0E8',
            fontSize: 16,
          }}
        />
        {showToggle ? (
          <TouchableOpacity onPress={onToggleVisible} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#A09880"
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, isLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!fullName.trim()) return setError('Please enter your full name.');
    if (!EMAIL_REGEX.test(email.trim())) return setError('Please enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    try {
      await signUp(email, password, fullName);
      router.replace({ pathname: '/(public)/verify-code', params: { email: email.trim() } });
    } catch (e) {
      let msg = 'Registration failed. Please try again.';
      if (e instanceof Error && e.message && e.message !== '{}') msg = e.message;
      else if (typeof e === 'string' && e && e !== '{}') msg = e;
      console.error('[SignUp]', e);
      setError(msg);
    }
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
            Create Account
          </Typography>
          <Typography variant="bodyMuted" className="mb-8 mt-2">
            Register to access your client portal and track your application.
          </Typography>

          <Field
            label="FULL NAME"
            value={fullName}
            onChange={setFullName}
            placeholder="Your full name"
          />
          <Field
            label="EMAIL"
            value={email}
            onChange={setEmail}
            placeholder="you@email.com"
            keyboardType="email-address"
          />
          <Field
            label="PASSWORD"
            value={password}
            onChange={setPassword}
            placeholder="Min. 8 characters"
            secure
            showToggle
            visible={showPassword}
            onToggleVisible={() => setShowPassword((v) => !v)}
          />
          <Field
            label="CONFIRM PASSWORD"
            value={confirm}
            onChange={setConfirm}
            placeholder="Repeat password"
            secure
            showToggle
            visible={showConfirm}
            onToggleVisible={() => setShowConfirm((v) => !v)}
          />

          {error ? (
            <View className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <Typography variant="caption" className="text-red-400">
                {error}
              </Typography>
            </View>
          ) : null}

          <View className="mb-4 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3">
            <Typography variant="caption" className="text-gold">
              After you tap Create Account, we&apos;ll email you a verification code. It can take a minute or two to arrive and stays valid for 10 minutes — no rush, just check your spam folder if you don&apos;t see it.
            </Typography>
          </View>

          <Button
            label={isLoading ? 'Creating Account…' : 'Create Account'}
            onPress={onSubmit}
            variant="solid"
            fullWidth
            disabled={isLoading}
            className="mt-2"
          />

          <Pressable
            onPress={() => router.replace('/(public)/login')}
            className="mt-6 items-center"
          >
            <Typography variant="label" className="text-gold">
              Already have an account? Sign In
            </Typography>
          </Pressable>

          <View className="mt-8 pb-8">
            <LegalLinksRow />
          </View>
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
