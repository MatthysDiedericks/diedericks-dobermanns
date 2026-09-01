/** Shared invite-failure labels. Keep identical to diedericksdobermann-web/src/lib/portal/inviteFail.ts. */

export type InviteFailReason = 'wrong-code' | 'expired' | 'used' | 'no-invite' | 'signed-in';

export type InviteDiagnoseRow = {
  exists: boolean;
  expires_at: string | null;
  code_redeemed_at: string | null;
  invited_at: string | null;
};

export function reasonFromDiagnose(
  row: InviteDiagnoseRow | null | undefined,
): Exclude<InviteFailReason, 'signed-in'> {
  if (!row || row.exists === false) return 'no-invite';
  if (row.exists !== true && !row.invited_at) return 'no-invite';
  if (row.code_redeemed_at) return 'used';
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return 'expired';
  return 'wrong-code';
}

export function inviteFailUserMessage(reason: InviteFailReason): string {
  if (reason === 'used') return 'This code has already been used — ask Matt for a new one.';
  if (reason === 'expired') return 'That invite has expired. Ask Matt for a new one.';
  if (reason === 'no-invite') return 'No invite was issued for this email. Ask Matt for one.';
  if (reason === 'wrong-code') return 'That code is not right. Check the digits and try again.';
  return 'You are already signed in.';
}

export function inviteFailLogMessage(reason: InviteFailReason): string {
  if (reason === 'used') return 'Invite already used';
  if (reason === 'expired') return 'Invite has expired';
  if (reason === 'no-invite') return 'No portal invite has been issued for this email';
  if (reason === 'wrong-code') return 'Invite code did not match';
  return 'Already signed in';
}
