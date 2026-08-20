import { Badge } from '@/components/ui/Badge';
import { formatInviteState, isInvitedNotOpened, type InviteStateRow } from '@/lib/portal/invite';

export function InviteStateChip({ state }: { state: InviteStateRow | null | undefined }) {
  const label = formatInviteState(state);
  return <Badge label={label} tone={isInvitedNotOpened(state) ? 'gold' : 'muted'} />;
}
