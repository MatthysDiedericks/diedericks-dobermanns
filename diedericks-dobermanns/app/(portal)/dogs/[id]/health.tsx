import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { DogHealthTab } from '@/components/portal/DogHealthTab';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useVaccinations } from '@/hooks/useRecords';

export default function DogHealthScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dogId = id ?? '';
  const { data: vaccinations, loading } = useVaccinations(dogId);
  const [reminders, setReminders] = useState(true);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Health" title="Vaccination Schedule" />
      <View className="px-6 pb-10">
        {!loading ? <DogHealthTab vaccinations={vaccinations} /> : null}
        <Card className="mt-4 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Typography variant="subtitle">Vaccination reminders</Typography>
            <Typography variant="caption" className="mt-1 text-silver">
              Notify me before the next due date.
            </Typography>
          </View>
          <Switch
            value={reminders}
            onValueChange={setReminders}
            trackColor={{ false: '#2E2B1E', true: '#C4A35A55' }}
            thumbColor={reminders ? '#C4A35A' : '#5C5746'}
          />
        </Card>
      </View>
    </ScreenContainer>
  );
}
