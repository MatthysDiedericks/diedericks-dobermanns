import { Badge } from '@/components/ui/Badge';
import {
  formatInviteState,
  isConfirmedNeverSignedIn,
  isInviteStuck,
  type InviteStateRow,
} from '@/lib/portal/invite';

export function InviteStateChip({ state }: { state: InviteStateRow | null | undefined }) {
  const label = formatInviteState(state);
  const locked = isConfirmedNeverSignedIn(state);
  return (
    <Badge
      label={label}
      tone={locked ? 'danger' : isInviteStuck(state) ? 'gold' : 'muted'}
    />
  );
}
