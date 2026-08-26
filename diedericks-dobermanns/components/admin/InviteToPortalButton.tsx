import { useEffect, useState } from 'react';
import { Share, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import {
  emailPortalInvite,
  formatInviteExpiry,
  formatInviteState,
  inviteToPortal,
  INVITE_TTL_DAYS,
  isInviteStuck,
  type InviteSource,
  type InviteStateRow,
} from '@/lib/portal/invite';

/** Admin invite. Share sheet first (WhatsApp on a phone). Email is a second tap. */
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
  const [issued, setIssued] = useState<{
    link: string;
    code: string;
    expiresAt: string;
    whatsappMessage: string;
  } | null>(null);

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
    setIssued({
      link: res.link,
      code: res.code,
      expiresAt: res.expiresAt,
      whatsappMessage: res.whatsappMessage,
    });
    setNotice(
      `Invite ready. Expires ${formatInviteExpiry(res.expiresAt)} (${INVITE_TTL_DAYS} days). Share on WhatsApp — nothing else is sent until you tap send there.`,
    );
    try {
      await Share.share({ message: res.whatsappMessage, url: res.link });
    } catch {
      /* user dismissed the sheet */
    }
  }

  async function onEmail() {
    if (!issued) return;
    setBusy(true);
    setError(null);
    const res = await emailPortalInvite({
      email: email!,
      fullName,
      link: issued.link,
      code: issued.code,
      expiresAt: issued.expiresAt,
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setNotice('Email sent. WhatsApp is still the safer path.');
  }

  const resent = isInviteStuck(initialState) || Boolean(issued);

  return (
    <View className="gap-2">
      <Typography variant="caption" className="text-gold">
        {stateLabel}
      </Typography>
      <Button
        label={busy ? 'Preparing…' : resent ? 'Re-issue invite' : 'Invite to portal'}
        onPress={() => void onInvite()}
        loading={busy}
        fullWidth
      />
      {issued ? (
        <>
          <Typography variant="caption" className="text-subtle">
            Read this code out if they are stuck. Nothing fetches it.
          </Typography>
          <Typography className="text-center font-cinzel text-2xl tracking-[0.2em] text-gold">
            {issued.code}
          </Typography>
          <Typography variant="caption" className="text-subtle">
            {issued.link}
          </Typography>
          <Button
            label="Email the invite"
            variant="outline"
            onPress={() => void onEmail()}
            disabled={busy}
            fullWidth
          />
        </>
      ) : null}
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
