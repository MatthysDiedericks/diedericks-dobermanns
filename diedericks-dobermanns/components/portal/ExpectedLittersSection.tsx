import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';
import {
  useExpectedLittersPortal,
  type ExpectedLitterPortalItem,
} from '@/hooks/useExpectedLittersPortal';
import { formatKennelDate } from '@/lib/kennel/formatters';

function ExpectedLitterCard({ item }: { item: ExpectedLitterPortalItem }) {
  const sire = item.sireName ?? 'TBD';
  return (
    <Card className="mb-3">
      <Typography variant="subtitle">
        {item.damName} × {sire}
      </Typography>
      <Typography variant="caption" className="mt-1 text-gold">
        Estimated arrival ~{formatKennelDate(item.headlineDue ?? item.whelpExpected)}
      </Typography>
      <Typography variant="caption" className="mt-1 text-muted">
        Whelp window (estimate): {formatKennelDate(item.whelpEarliest)} –{' '}
        {formatKennelDate(item.whelpLatest)}
      </Typography>
      <Typography variant="caption" className="mt-1 text-muted">
        Go-home window (estimate): {formatKennelDate(item.goHomeEarliest)} –{' '}
        {formatKennelDate(item.goHomeLatest)}
      </Typography>
      {item.availableCount != null ? (
        <Typography variant="caption" className="mt-1">
          {item.availableCount} pup{item.availableCount === 1 ? '' : 's'} available
        </Typography>
      ) : null}
      <Typography variant="bodyMuted" className="mt-2">
        Dates are estimates and may shift.
      </Typography>
    </Card>
  );
}

export function ExpectedLittersSection({ compact }: { compact?: boolean }) {
  const { items, loading, error } = useExpectedLittersPortal();
  const shown = compact ? items.slice(0, 2) : items;

  return (
    <View>
      <SectionHeader eyebrow="Upcoming" title="Expected Litters" />
      {loading ? <CardListSkeleton count={2} /> : null}
      {error ? (
        <Typography variant="body" className="text-danger">
          {error}
        </Typography>
      ) : null}
      {!loading && items.length === 0 ? (
        <EmptyState
          title="No expected litters"
          message="Upcoming litters will appear here when announced publicly."
        />
      ) : null}
      {shown.map((item) => (
        <ExpectedLitterCard key={`${item.source}-${item.id}`} item={item} />
      ))}
    </View>
  );
}
