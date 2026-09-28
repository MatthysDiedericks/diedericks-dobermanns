import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { entryDisplayName } from '@/lib/waitlist/helpers';
import { reconcileWaitingList } from '@/lib/waitlist/placementClose';
import type { WaitingListEntry } from '@/types/app.types';

const TITLES = {
  reservedStaleNoDog: 'Reserved for more than 30 days with no assigned dog',
  depositPaidNoDog: 'Deposit paid with no assigned dog',
  closedUnlinked: 'Closed but the dog was never linked',
} as const;

export function WaitlistReconcile({
  entries,
  onSelect,
}: {
  entries: WaitingListEntry[];
  onSelect: (entry: WaitingListEntry) => void;
}) {
  const report = reconcileWaitingList(entries);
  const [open, setOpen] = useState<string | null>(null);
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const sections = [
    { key: 'reservedStaleNoDog', title: TITLES.reservedStaleNoDog, ids: report.reservedStaleNoDog.map((e) => e.id) },
    { key: 'depositPaidNoDog', title: TITLES.depositPaidNoDog, ids: report.depositPaidNoDog.map((e) => e.id) },
    { key: 'closedUnlinked', title: TITLES.closedUnlinked, ids: report.closedUnlinked.map((e) => e.id) },
  ];

  return (
    <View className="mb-4 px-4">
      <Typography variant="label" className="mb-2 text-gold">
        Needs a look
      </Typography>
      {sections.map((section) => (
        <View key={section.key} className="mb-2 rounded-lg border border-gold/20 bg-surface px-3 py-2">
          <Pressable onPress={() => setOpen((current) => (current === section.key ? null : section.key))}>
            <View className="flex-row items-center justify-between gap-3">
              <Typography variant="caption" className="flex-1">
                {section.title}
              </Typography>
              <Typography variant="subtitle" className="text-gold">
                {section.ids.length}
              </Typography>
            </View>
          </Pressable>
          {open === section.key ? (
            <View className="mt-2">
              {section.ids.length === 0 ? (
                <Typography variant="caption" className="text-silver">
                  None
                </Typography>
              ) : (
                section.ids.map((id) => {
                  const entry = byId.get(id);
                  if (!entry) return null;
                  return (
                    <Pressable key={id} onPress={() => onSelect(entry)} className="py-1">
                      <Typography variant="caption" className="text-gold">
                        {entryDisplayName(entry)}
                      </Typography>
                    </Pressable>
                  );
                })
              )}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}
