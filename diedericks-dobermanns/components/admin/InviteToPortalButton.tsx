import { useEffect, useState } from 'react';
import { Share, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import {
  formatInviteState,
  inviteToPortal,
  isInvitedNotOpened,
  type InviteSource,
  type InviteStateRow,
} from '@/lib/portal/invite';

/** Admin invite. Share sheet is the WhatsApp path — nothing auto-sends. */
export function InviteToPortalButton({
  email,
  fullName,
  phone,
  source,
  sourceId,
  initialState,
}: {
  email: string | null | undefined;
  fullName: string;
  phone?: string | null;
  source: InviteSource;
  sourceId?: string | null;
  initialState?: InviteStateRow | null;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stateLabel, setStateLabel] = useState(formatInviteState(initialState));

  useEffect(() => {
    setStateLabel(formatInviteState(initialState));
  }, [initialState]);

  if (!email?.includes('@')) {
    return (
      <Typography variant="caption" className="text-subtle">
        Add an email before inviting them to the portal.
      </Typography>
    );
  }

  async function onInvite() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await inviteToPortal({
      email: email!,
      fullName,
      phone,
      source,
      sourceId,
    });
    setBusy(false);
    if (!('link' in res) || !res.link) {
      setError('error' in res && res.error ? res.error : 'Could not invite.');
      return;
    }
    setStateLabel(
      `Invited ${new Date(res.invitedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} (not opened)`,
    );
    setNotice(
      res.emailSent
        ? 'Email sent. Share the link on WhatsApp — nothing else is sent until you tap send there.'
        : (res.error ?? 'Link ready. Share it on WhatsApp.'),
    );
    try {
      await Share.share({ message: res.whatsappMessage, url: res.link });
    } catch {
      /* user dismissed the sheet */
    }
  }

  const resent = isInvitedNotOpened(initialState);

  return (
    <View className="gap-2">
      <Typography variant="caption" className="text-gold">
        {stateLabel}
      </Typography>
      <Button
        label={busy ? 'Preparing…' : resent ? 'Resend link' : 'Invite to portal'}
        onPress={() => void onInvite()}
        loading={busy}
        fullWidth
      />
      {notice ? (
        <Typography variant="caption" className="text-gold">
          {notice}
        </Typography>
      ) : null}
      {error ? (
        <Typography variant="caption" className="text-danger">
          {error}
        </Typography>
      ) : null}
    </View>
  );
}
