import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { AccordionSection } from '@/components/dogs/detail/AccordionSection';
import {
  DewormingDogRow,
  VaccinationDogRow,
  VetVisitDogRow,
} from '@/components/health/HealthDogRows';
import {
  HealthRecordSheets,
  type HealthRecordSheetsHandle,
  type HealthSheetMode,
} from '@/components/health/HealthRecordSheets';
import { UpcomingHealthStrip } from '@/components/health/UpcomingHealthStrip';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useHealthSummaries, useUpcomingHealthEvents } from '@/hooks/useHealth';
import type { UpcomingHealthEvent } from '@/lib/health/types';

interface HealthHubScreenProps {
  settingsRoute?: string;
  geneticsRoute?: string;
}

export function HealthHubScreen({
  settingsRoute = '/(admin)/health/settings',
  geneticsRoute = '/(tabs)/genetics',
}: HealthHubScreenProps) {
  const router = useRouter();
  const sheets = useRef<HealthRecordSheetsHandle>(null);
  const {
    vaccinationSummaries,
    dewormingSummaries,
    vetSummaries,
    loading,
    refresh,
  } = useHealthSummaries();
  const { events: upcoming, refresh: refreshUpcoming } = useUpcomingHealthEvents(30);

  function onRefresh() {
    void refresh();
    void refreshUpcoming();
  }

  function openHistory(mode: HealthSheetMode, dogId: string) {
    sheets.current?.openHistory(mode, dogId);
  }

  function onUpcomingPress(event: UpcomingHealthEvent) {
    const mode: HealthSheetMode =
      event.eventType === 'vaccination'
        ? 'vaccination'
        : event.eventType === 'vet_visit'
          ? 'vet_visit'
          : 'deworming';
    sheets.current?.openHistory(mode, event.dogId);
  }

  return (
    <ScreenContainer scroll={false}>
      <View className="flex-row items-start justify-between px-6">
        <View className="flex-1">
          <PageHeader eyebrow="Care" title="Health" back={false} />
        </View>
        <Pressable
          onPress={() => router.push(settingsRoute as never)}
          className="mt-2 h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-gold/10"
          accessibilityLabel="Health settings"
        >
          <Ionicons name="settings-outline" size={22} color={Colors.gold} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={Colors.gold} />
        }
      >
        <UpcomingHealthStrip events={upcoming} onPressEvent={onUpcomingPress} />

        {loading ? (
          <View className="px-6">
            <CardListSkeleton count={4} />
          </View>
        ) : (
          <View className="px-6">
            <AccordionSection title="Vaccinations" count={vaccinationSummaries.length} defaultOpen>
              {vaccinationSummaries.map((s) => (
                <VaccinationDogRow
                  key={s.dog.id}
                  dog={s.dog}
                  lastVaccine={s.lastVaccine}
                  lastDate={s.lastDate}
                  nextDue={s.nextDue}
                  onPress={() => openHistory('vaccination', s.dog.id)}
                />
              ))}
              <Button
                label="+ Add Vaccination"
                variant="outline"
                onPress={() => sheets.current?.openAdd('vaccination')}
                fullWidth
                className="mt-2"
              />
            </AccordionSection>

            <AccordionSection title="Worms / Ticks & Fleas" count={dewormingSummaries.length}>
              {dewormingSummaries.map((s) => (
                <DewormingDogRow
                  key={s.dog.id}
                  dog={s.dog}
                  lastDewormDate={s.lastDewormDate}
                  lastTickFleaDate={s.lastTickFleaDate}
                  nextDewormDue={s.nextDewormDue}
                  nextTickFleaDue={s.nextTickFleaDue}
                  onPress={() => openHistory('deworming', s.dog.id)}
                />
              ))}
              <Button
                label="+ Add Treatment"
                variant="outline"
                onPress={() => sheets.current?.openAdd('deworming')}
                fullWidth
                className="mt-2"
              />
            </AccordionSection>

            <AccordionSection title="Vet Visits" count={vetSummaries.length}>
              {vetSummaries.map((s) => (
                <VetVisitDogRow
                  key={s.dog.id}
                  dog={s.dog}
                  lastVisitDate={s.lastVisitDate}
                  lastReason={s.lastReason}
                  nextDue={s.nextDue}
                  onPress={() => openHistory('vet_visit', s.dog.id)}
                />
              ))}
              <Button
                label="+ Add Vet Visit"
                variant="outline"
                onPress={() => sheets.current?.openAdd('vet_visit')}
                fullWidth
                className="mt-2"
              />
            </AccordionSection>

            <Pressable onPress={() => router.push(geneticsRoute as never)}>
              <Card>
                <Typography variant="subtitle" className="text-gold">
                  Genetic Forecast
                </Typography>
                <Typography variant="caption" className="mt-1 text-muted">
                  Colour genetics calculator — unchanged
                </Typography>
              </Card>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <HealthRecordSheets ref={sheets} onSaved={onRefresh} />
    </ScreenContainer>
  );
}
