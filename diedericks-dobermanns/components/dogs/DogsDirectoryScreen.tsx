import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  View,
} from 'react-native';

import {
  AlumniDogCard,
  DeceasedDogCard,
  DogDirectoryCard,
  ExpectingDogCard,
} from '@/components/dogs/DogDirectoryCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useKennelDogs } from '@/hooks/useKennelDogs';
import { isAdminPlus } from '@/lib/auth/routes';
import type { DogFilterTab } from '@/types/phase10';

const FILTERS: { key: DogFilterTab; label: string }[] = [
  { key: 'breeding', label: 'Breeding Stock' },
  { key: 'expecting', label: 'Expecting' },
  { key: 'deceased', label: 'Deceased' },
  { key: 'alumni', label: 'Alumni' },
];

interface DogsDirectoryScreenProps {
  detailRoute: (dogId: string) => string;
  showAddButton?: boolean;
  headerEyebrow?: string;
  headerTitle?: string;
}

export function DogsDirectoryScreen({
  detailRoute,
  showAddButton = true,
  headerEyebrow = 'Kennel',
  headerTitle = 'Dogs',
}: DogsDirectoryScreenProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<DogFilterTab>('breeding');
  const [search, setSearch] = useState('');
  const {
    breedingStock,
    expecting,
    deceased,
    alumni,
    totalCount,
    loading,
    error,
    refresh,
    role,
  } = useKennelDogs(filter, search);
  const canAdd = showAddButton && (isAdminPlus(role) || role === 'trainer');

  const emptyMessages: Record<DogFilterTab, { title: string; message: string }> = {
    breeding: {
      title: 'No breeding stock',
      message: 'Add active studs and breeding females to your kennel.',
    },
    expecting: {
      title: 'No litters currently expected',
      message: 'Dogs with a recorded mating and no whelp date will appear here.',
    },
    deceased: {
      title: 'No records',
      message: 'Deceased dogs will be listed here in memory.',
    },
    alumni: {
      title: 'No alumni yet',
      message: 'Placed dogs will appear here once their status is updated.',
    },
  };

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow={headerEyebrow} title={headerTitle} back={false} />

      <View className="mb-3 px-6">
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, call name, microchip"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3 max-h-12"
          contentContainerStyle={{ gap: 8 }}
        >
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              className={`rounded-full border px-4 py-2 ${
                filter === f.key ? 'border-gold bg-gold/15' : 'border-gold/25'
              }`}
            >
              <Typography variant="caption">{f.label}</Typography>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {error ? (
        <Typography variant="body" className="mb-2 px-6 text-danger">
          {error}
        </Typography>
      ) : null}

      {loading ? (
        <View className="px-6">
          <CardListSkeleton count={5} />
        </View>
      ) : totalCount === 0 ? (
        <EmptyState
          title={emptyMessages[filter].title}
          message={emptyMessages[filter].message}
        />
      ) : filter === 'breeding' ? (
        <SectionList
          sections={[
            ...(breedingStock.studs.length
              ? [{ title: 'Studs', data: breedingStock.studs }]
              : []),
            ...(breedingStock.females.length
              ? [{ title: 'Breeding Females', data: breedingStock.females }]
              : []),
          ]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: canAdd ? 96 : 48 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={Colors.gold} />
          }
          renderSectionHeader={({ section: { title } }) => (
            <Typography variant="label" className="mb-2 mt-2 text-gold">
              {title.toUpperCase()}
            </Typography>
          )}
          renderItem={({ item }) => (
            <DogDirectoryCard dog={item} detailRoute={detailRoute(item.id)} variant="breeding" />
          )}
        />
      ) : filter === 'expecting' ? (
        <FlatList
          data={expecting}
          keyExtractor={(item) => item.dog.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: canAdd ? 96 : 48 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={Colors.gold} />
          }
          renderItem={({ item }) => (
            <ExpectingDogCard entry={item} detailRoute={detailRoute(item.dog.id)} />
          )}
        />
      ) : filter === 'deceased' ? (
        <FlatList
          data={deceased}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: canAdd ? 96 : 48 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={Colors.gold} />
          }
          renderItem={({ item }) => (
            <DeceasedDogCard dog={item} detailRoute={detailRoute(item.id)} />
          )}
        />
      ) : (
        <FlatList
          data={alumni}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: canAdd ? 96 : 48 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={Colors.gold} />
          }
          renderItem={({ item }) => (
            <AlumniDogCard dog={item} detailRoute={detailRoute(item.id)} />
          )}
        />
      )}

      {canAdd ? (
        <View className="absolute bottom-6 right-6">
          <Button label="+ Dog" onPress={() => router.push('/(admin)/dogs/new' as never)} />
        </View>
      ) : null}
    </ScreenContainer>
  );
}
