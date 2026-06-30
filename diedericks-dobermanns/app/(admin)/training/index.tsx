import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { TrainingVideosTab } from '@/components/Training/TrainingVideosTab';
import { TrainingAvailabilityTab } from '@/components/Training/TrainingAvailabilityTab';
import { TrainingCalendarTab } from '@/components/Training/TrainingCalendarTab';
import { TrainingRequestsTab } from '@/components/Training/TrainingRequestsTab';
import { TrainingSessionTypesTab } from '@/components/Training/TrainingSessionTypesTab';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';

const TABS = ['Requests', 'Calendar', 'Session Types', 'Availability', 'Videos'] as const;
type Tab = (typeof TABS)[number];

export default function TrainingDashboard() {
  const [tab, setTab] = useState<Tab>('Requests');

  return (
    <ScreenContainer keyboardShouldPersistTaps="handled">
      <PageHeader eyebrow="Training" title="Training Dashboard" back={false} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
      >
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className={`rounded-full border px-4 py-2 ${active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'}`}
            >
              <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>
                {t}
              </Typography>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="mt-6">
        {tab === 'Requests' ? <TrainingRequestsTab /> : null}
        {tab === 'Calendar' ? <TrainingCalendarTab /> : null}
        {tab === 'Session Types' ? <TrainingSessionTypesTab /> : null}
        {tab === 'Availability' ? <TrainingAvailabilityTab /> : null}
        {tab === 'Videos' ? <TrainingVideosTab /> : null}
      </View>
    </ScreenContainer>
  );
}
