import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';

import { GuestAccessBanner } from '@/components/portal/GuestAccessBanner';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useGuestAccess } from '@/hooks/useGuestAccess';
import { usePortalMembers } from '@/hooks/usePortalMembers';
import {
  FINANCIAL_TOGGLE_COPY,
  MEMBER_CAP,
  invitePortalMember,
  resendPortalMemberInvite,
  revokePortalMember,
  setPortalMemberFinancials,
} from '@/lib/portal/members';
import { useAuthStore } from '@/stores/authStore';

export default function PortalAccessScreen() {
  const guest = useGuestAccess();
  const { members, loading, error, refresh, holderId } = usePortalMembers();
  const profile = useAuthStore((s) => s.profile);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [financial, setFinancial] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const atCap = members.length >= MEMBER_CAP;

  if (guest.isGuest) {
    return (
      <ScreenContainer>
        <PageHeader eyebrow="Account" title="Portal access" />
        <View className="px-6">
          <GuestAccessBanner access={guest} />
        </View>
      </ScreenContainer>
    );
  }

  async function onInvite() {
    if (!holderId) return;
    setBusy(true);
    setFormError(null);
    const result = await invitePortalMember({
      holderId,
      holderName: profile?.full_name ?? 'A Diedericks Dobermanns client',
      fullName,
      email,
      relationship,
      canViewFinancials: financial,
    });
    setBusy(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setFullName('');
    setEmail('');
    setRelationship('');
    setFinancial(false);
    await refresh();
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Account" title="Portal access" />
      <ScrollView className="px-6 pb-12">
        <Typography variant="bodyMuted" className="mb-4">
          Add up to two people. They are guests — they never sign and never appear on a contract.
        </Typography>
        {error ? (
          <Typography variant="body" className="mb-4 text-danger">
            {error}
          </Typography>
        ) : loading ? (
          <Typography variant="bodyMuted" className="mb-4">
            Loading…
          </Typography>
        ) : members.length === 0 ? (
          <Typography variant="bodyMuted" className="mb-4">
            No one else can open this portal yet.
          </Typography>
        ) : (
          members.map((m) => (
            <Card key={m.id} className="mb-3 p-4">
              <Typography variant="subtitle">{m.full_name}</Typography>
              <Typography variant="caption" className="mt-1 text-subtle">
                {m.invited_email}
                {m.relationship ? ` · ${m.relationship}` : ''} ·{' '}
                {m.status === 'active' ? 'Active' : 'Invite sent'}
              </Typography>
              <View className="mt-3 flex-row items-center justify-between">
                <Typography variant="caption" className="mr-3 flex-1 text-subtle">
                  Financial access
                </Typography>
                <Switch
                  value={m.can_view_financials}
                  onValueChange={(v) => {
                    void setPortalMemberFinancials(m.id, v).then(() => refresh());
                  }}
                />
              </View>
              <View className="mt-3 flex-row gap-2">
                {m.status === 'pending' ? (
                  <Button
                    label="Resend invite"
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      void resendPortalMemberInvite({
                        memberId: m.id,
                        holderName: profile?.full_name ?? 'A Diedericks Dobermanns client',
                      }).then(() => refresh());
                    }}
                  />
                ) : null}
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      'Remove access?',
                      'Removal is immediate. They will lose this portal on their next request.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () => {
                            if (!holderId) return;
                            void revokePortalMember(m.id, holderId).then(() => refresh());
                          },
                        },
                      ],
                    );
                  }}
                >
                  <Typography variant="caption" className="text-danger">
                    Remove access
                  </Typography>
                </Pressable>
              </View>
            </Card>
          ))
        )}

        <Typography variant="label" className="mb-2 mt-4 text-gold">
          Add someone to my portal
        </Typography>
        {atCap ? (
          <Typography variant="bodyMuted">
            You already have two people on your portal. Remove someone before adding another.
          </Typography>
        ) : (
          <Card className="p-4">
            <Input label="Full name" value={fullName} onChangeText={setFullName} />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Relationship"
              value={relationship}
              onChangeText={setRelationship}
              placeholder="Wife, son, handler…"
            />
            <View className="mb-3 mt-2 flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Typography variant="caption">Allow financial access</Typography>
                <Typography variant="caption" className="mt-1 text-subtle">
                  {FINANCIAL_TOGGLE_COPY}
                </Typography>
              </View>
              <Switch value={financial} onValueChange={setFinancial} />
            </View>
            {formError ? (
              <Typography variant="body" className="mb-2 text-danger">
                {formError}
              </Typography>
            ) : null}
            <Button label={busy ? 'Sending…' : 'Invite'} onPress={() => void onInvite()} loading={busy} fullWidth />
          </Card>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
