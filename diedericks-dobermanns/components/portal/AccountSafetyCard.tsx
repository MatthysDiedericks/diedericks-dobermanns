import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { changeEmailWithCurrent, changePasswordWithCurrent } from '@/lib/auth/accountSafety';
import { evaluatePassword } from '@/lib/auth/passwordPolicy';

export function AccountSafetyCard({ email }: { email: string }) {
  const [current, setCurrent] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [nextEmail, setNextEmail] = useState(email);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onPassword() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    const { error } = await changePasswordWithCurrent(current, nextPassword);
    setBusy(false);
    if (error) {
      setErr(error);
      return;
    }
    setCurrent('');
    setNextPassword('');
    setMsg('Password updated. Other devices have been signed out.');
  }

  async function onEmail() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    const { error } = await changeEmailWithCurrent(current, nextEmail);
    setBusy(false);
    if (error) {
      setErr(error);
      return;
    }
    setMsg('Check the new address to confirm the change.');
  }

  const checks = evaluatePassword(nextPassword);

  return (
    <View className="mb-6 rounded-2xl border border-gold/15 bg-black-rich p-4">
      <Typography variant="label" className="mb-3 text-gold">
        PASSWORD & EMAIL
      </Typography>
      <Input label="Current password" value={current} onChangeText={setCurrent} secureTextEntry />
      <Input
        label="New password"
        value={nextPassword}
        onChangeText={setNextPassword}
        secureTextEntry
        className="mt-3"
      />
      {nextPassword
        ? checks.map((c) => (
            <Typography key={c.id} variant="caption" className={c.met ? 'text-gold' : 'text-subtle'}>
              {c.met ? '✓' : '·'} {c.label}
            </Typography>
          ))
        : null}
      <Button
        label={busy ? 'Saving…' : 'Change password'}
        variant="outline"
        onPress={() => void onPassword()}
        disabled={busy}
        fullWidth
        className="mt-3"
      />
      <Input
        label="New email"
        value={nextEmail}
        onChangeText={setNextEmail}
        keyboardType="email-address"
        className="mt-4"
      />
      <Button
        label={busy ? 'Saving…' : 'Change email'}
        variant="outline"
        onPress={() => void onEmail()}
        disabled={busy}
        fullWidth
        className="mt-3"
      />
      {msg ? (
        <Typography variant="caption" className="mt-2 text-gold">
          {msg}
        </Typography>
      ) : null}
      {err ? (
        <Typography variant="caption" className="mt-2 text-danger">
          {err}
        </Typography>
      ) : null}
    </View>
  );
}
