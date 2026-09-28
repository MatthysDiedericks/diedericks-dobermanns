import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useMyDogs } from '@/hooks/useMyDogs';
import {
  kennelCountLine,
  kennelInitial,
  kennelSectionHeading,
  sortKennelDogs,
  splitBySex,
  visibleMyDogs,
  type KennelCard,
  type KennelSort,
} from '@/lib/dogs/kennel';
import { supabaseThumbUrl } from '@/lib/thumbs';

const SORTS: { key: KennelSort; label: string }[] = [
  { key: 'status', label: 'Status' },
  { key: 'name', label: 'Name' },
  { key: 'age', label: 'Age' },
];

function PhotoBlock({ card }: { card: KennelCard }) {
  const [failed, setFailed] = useState(false);
  const url = card.photo.kind === 'image' ? supabaseThumbUrl(card.photo.url, 'grid') ?? card.photo.url : null;
  const letter = card.photo.kind === 'initial' ? card.photo.letter : kennelInitial(card.callName);

  if (!url || failed) {
    return (
      <View className="h-44 items-center justify-center bg-black-rich">
        <Typography variant="display" className="text-gold">
          {letter}
        </Typography>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={{ width: '100%', height: 176 }}
      contentFit="cover"
      onError={() => setFailed(true)}
    />
  );
}

function DogCard({
  card,
  onPress,
}: {
  card: KennelCard;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${card.callName}, open profile`}
      className={`mb-3 w-full overflow-hidden rounded-xl border border-gold/20 bg-surface ${
        card.archived ? 'opacity-60' : ''
      }`}
    >
      <PhotoBlock card={card} />
      <View className="gap-1.5 p-4">
        <Typography variant="title" className="text-gold" numberOfLines={2}>
          {card.callName}
        </Typography>
        {card.registeredName ? (
          <Typography variant="caption" numberOfLines={2}>
            {card.registeredName}
          </Typography>
        ) : null}
        <View className="self-start rounded-full border border-gold/30 px-2 py-0.5">
          <Typography variant="label">{card.chip}</Typography>
        </View>
        {card.age ? (
          <View>
            <Typography variant="body">{card.age}</Typography>
            {card.dobLabel ? (
              <Typography variant="caption">{card.dobLabel}</Typography>
            ) : null}
          </View>
        ) : null}
        {card.microchip ? (
          <Typography variant="caption">{card.microchip}</Typography>
        ) : null}
        {card.colourLine ? <Typography variant="body">{card.colourLine}</Typography> : null}
        {card.flags.length > 0 ? (
          <View className="flex-row flex-wrap gap-1">
            {card.flags.map((flag) => (
              <View key={flag} className="rounded-full border border-amber-200/40 bg-amber-200/10 px-2 py-0.5">
                <Typography variant="caption" className="text-amber-200">
                  {flag}
                </Typography>
              </View>
            ))}
          </View>
        ) : null}
        {card.archiveLabel ? (
          <Typography variant="caption">{card.archiveLabel}</Typography>
        ) : null}
        {card.detailLine ? (
          <Typography variant="body" className="mt-1">
            {card.detailLine}
          </Typography>
        ) : null}
      </View>
    </Pressable>
  );
}

function Section({
  title,
  cards,
  onOpen,
}: {
  title: string;
  cards: KennelCard[];
  onOpen: (id: string) => void;
}) {
  if (cards.length === 0) return null;
  return (
    <View className="mb-4">
      <Typography variant="label" className="mb-2 text-gold">
        {kennelSectionHeading(title, cards.length)}
      </Typography>
      {cards.map((card) => (
        <DogCard key={card.id} card={card} onPress={() => onOpen(card.id)} />
      ))}
    </View>
  );
}

export function MyDogsList({
  search,
  detailRoute,
}: {
  search: string;
  detailRoute: (dogId: string) => string;
}) {
  const router = useRouter();
  const { cards, loading, error, refresh } = useMyDogs();
  const [sort, setSort] = useState<KennelSort>('status');
  const [showArchived, setShowArchived] = useState(false);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = visibleMyDogs(cards, showArchived).filter((card) => {
      if (!q) return true;
      const hay = [card.callName, card.registeredName, card.microchip, card.colourLine]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
    return sortKennelDogs(matched, sort);
  }, [cards, search, showArchived, sort]);
  const { females, males, other } = splitBySex(visible);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 96 }}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={Colors.gold} />
      }
    >
      <Typography variant="caption" className="mb-3">
        {kennelCountLine(visible)}
      </Typography>
      {error ? (
        <Typography variant="body" className="mb-2 text-danger">
          {error}
        </Typography>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 max-h-12">
        <View className="flex-row gap-2">
          {SORTS.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => setSort(option.key)}
              className={`rounded-full border px-4 py-2 ${
                sort === option.key ? 'border-gold bg-gold/15' : 'border-gold/25'
              }`}
            >
              <Typography variant="caption">{option.label}</Typography>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setShowArchived((value) => !value)}
            className={`rounded-full border px-4 py-2 ${
              showArchived ? 'border-gold bg-gold/15' : 'border-gold/25'
            }`}
          >
            <Typography variant="caption">Show deceased</Typography>
          </Pressable>
        </View>
      </ScrollView>
      {!loading && visible.length === 0 ? (
        <Typography variant="bodyMuted">No dogs in the kennel right now.</Typography>
      ) : (
        <>
          <Section title="Females" cards={females} onOpen={(id) => router.push(detailRoute(id) as never)} />
          <Section title="Males" cards={males} onOpen={(id) => router.push(detailRoute(id) as never)} />
          <Section title="Other" cards={other} onOpen={(id) => router.push(detailRoute(id) as never)} />
        </>
      )}
    </ScrollView>
  );
}
