import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { VersionHistoryItem } from '@/lib/applications/pendingChanges';
import { formatDateTime } from '@/lib/format';

export function VersionHistoryList({ items }: { items: VersionHistoryItem[] }) {
  if (items.length === 0) {
    return <Typography variant="caption">No versions recorded yet.</Typography>;
  }
  return (
    <View className="gap-4">
      {[...items].reverse().map((item) => (
        <View key={item.versionNumber} className="border-l border-gold/30 pl-4">
          <Typography variant="body">
            Version {item.versionNumber}
            {item.changeReason ? ` · ${item.changeReason}` : ''}
          </Typography>
          {item.changes.length > 0 ? (
            item.changes.map((c) => (
              <Typography key={c.field} variant="caption" className="mt-0.5">
                {c.label}: {c.from} → {c.to}
              </Typography>
            ))
          ) : (
            <Typography variant="caption" className="mt-1">
              Original snapshot
            </Typography>
          )}
          <Typography variant="caption" className="mt-1">
            {formatDateTime(item.changedAt)}
            {item.changedByName ? ` · ${item.changedByName}` : ''}
          </Typography>
        </View>
      ))}
    </View>
  );
}
