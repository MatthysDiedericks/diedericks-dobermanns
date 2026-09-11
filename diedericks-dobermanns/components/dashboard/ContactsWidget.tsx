import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { Typography } from '@/components/ui/Typography';
import { useContactSummary } from '@/hooks/useContacts';
import { useOpenDuplicateCount } from '@/hooks/useContactDuplicates';
import { useUnreachableCount } from '@/hooks/useUnreachableContacts';

export function ContactsWidget() {
  const router = useRouter();
  const { summary } = useContactSummary();
  const { count: openDupes } = useOpenDuplicateCount();
  const { count: unreachableCount } = useUnreachableCount();

  const badge = unreachableCount > 0 ? unreachableCount : openDupes;

  return (
    <SurfaceCard title="Contacts" href="/(admin)/contacts" badge={badge} badgeTone="gold">
      <Typography variant="body">
        {summary.total} people · {summary.prospect} prospects
      </Typography>
      {unreachableCount > 0 ? (
        <Pressable
          onPress={() => router.push('/(admin)/contacts/unreachable' as never)}
          className="mt-3"
        >
          <Typography variant="label" className="text-gold">
            {unreachableCount} cannot be reached
          </Typography>
        </Pressable>
      ) : openDupes > 0 ? (
        <Pressable
          onPress={() => router.push('/(admin)/contacts/duplicates' as never)}
          className="mt-3"
        >
          <Typography variant="label" className="text-gold">
            {openDupes} possible duplicate{openDupes === 1 ? '' : 's'}
          </Typography>
        </Pressable>
      ) : (
        <Typography variant="caption" className="mt-2 text-subtle">
          Search by name, phone or email — including merged aliases.
        </Typography>
      )}
    </SurfaceCard>
  );
}
