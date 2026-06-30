import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Animated, Pressable, View } from 'react-native';
import { useEffect, useRef } from 'react';

import { DogStatusBadge } from '@/components/dogs/DogStatusBadge';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { ExpectingDogEntry, KennelDog } from '@/hooks/useKennelDogs';
import { formatKennelDate } from '@/lib/kennel/formatters';
import type { DogColour } from '@/types/app.types';

const COLOUR_HEX: Record<DogColour | string, string> = {
  'black/rust': '#1a1a1a',
  'blue/rust': '#2563eb',
  'fawn/rust': '#d2691e',
  'red/rust': '#dc2626',
};

function PulsingDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return <Animated.View style={{ opacity }} className="h-2 w-2 rounded-full bg-danger" />;
}

function SexColourRow({ sex, colour }: { sex: KennelDog['sex']; colour: KennelDog['colour'] }) {
  const sexColor = sex === 'male' ? '#60a5fa' : sex === 'female' ? '#f472b6' : Colors.silver;
  const dot = colour ? COLOUR_HEX[colour] ?? '#8C8474' : '#8C8474';

  return (
    <View className="mt-1 flex-row items-center gap-2">
      <Typography variant="caption" style={{ color: sexColor }}>
        {sex === 'male' ? '♂ Male' : sex === 'female' ? '♀ Female' : '—'}
      </Typography>
      {colour ? (
        <View className="flex-row items-center gap-1">
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dot }} />
          <Typography variant="caption" className="text-muted capitalize">
            {colour.replace('/', ' / ')}
          </Typography>
        </View>
      ) : null}
    </View>
  );
}

function DogPhoto({ dog, muted }: { dog: KennelDog; muted?: boolean }) {
  const photo =
    dog.media?.find((m) => m.is_primary)?.url ?? dog.media?.[0]?.url ?? null;

  return (
    <View
      className={`h-16 w-16 overflow-hidden rounded-xl bg-black-rich ${muted ? 'opacity-60' : ''}`}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={{ width: 64, height: 64 }} contentFit="cover" />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="paw" size={22} color={Colors.gold} />
        </View>
      )}
    </View>
  );
}

function displayName(dog: KennelDog): string {
  const call = dog.call_name?.trim();
  if (call && call.toLowerCase() !== dog.name.toLowerCase()) {
    return `${dog.name} (${call})`;
  }
  return dog.name;
}

interface DogDirectoryCardProps {
  dog: KennelDog;
  detailRoute: string;
  variant?: 'breeding' | 'deceased' | 'alumni';
  expecting?: ExpectingDogEntry;
}

export function DogDirectoryCard({
  dog,
  detailRoute,
  variant = 'breeding',
  expecting,
}: DogDirectoryCardProps) {
  const router = useRouter();
  const muted = variant === 'deceased';

  return (
    <Pressable
      onPress={() => router.push(detailRoute as never)}
      className={`mb-3 flex-row items-center rounded-xl border bg-surface p-4 ${
        muted ? 'border-gold/10 opacity-75' : 'border-gold/20'
      }`}
    >
      <DogPhoto dog={dog} muted={muted} />
      <View className="ml-4 flex-1">
        <Typography variant="subtitle" className="text-gold" numberOfLines={1}>
          {displayName(dog)}
        </Typography>
        <SexColourRow sex={dog.sex} colour={dog.colour} />

        {variant === 'breeding' && dog.inHeat ? (
          <View className="mt-2 flex-row items-center gap-2">
            <PulsingDot />
            <Typography variant="caption" className="text-danger">
              In Heat
            </Typography>
          </View>
        ) : null}

        {expecting ? (
          <View className="mt-2 gap-1">
            <View className="self-start rounded-full bg-gold/15 px-2.5 py-1">
              <Typography variant="caption" className="text-gold">
                Whelping in {Math.max(0, expecting.daysUntilWhelp)} days
              </Typography>
            </View>
            <Typography variant="caption" className="text-muted">
              Mated {formatKennelDate(expecting.matingDate)}
              {expecting.sireName ? ` · Sire: ${expecting.sireName}` : ''}
            </Typography>
            <Typography variant="caption" className="text-muted">
              Whelp {formatKennelDate(expecting.whelpEarliest)} –{' '}
              {formatKennelDate(expecting.whelpLatest)}
            </Typography>
            <Typography variant="caption" className="text-muted">
              Go-home {formatKennelDate(expecting.goHomeEarliest)} –{' '}
              {formatKennelDate(expecting.goHomeLatest)}
            </Typography>
          </View>
        ) : null}

        {variant === 'deceased' ? (
          <Typography variant="caption" className="mt-2 text-muted">
            DOB {formatKennelDate(dog.date_of_birth)} · Passed — not recorded
          </Typography>
        ) : null}

        {variant === 'alumni' ? (
          <Typography variant="caption" className="mt-2 text-muted">
            Placed {formatKennelDate(dog.updated_at?.slice(0, 10) ?? null)}
          </Typography>
        ) : null}

        <View className="mt-2">
          <DogStatusBadge status={dog.status} alumniLabel={variant === 'alumni'} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={muted ? Colors.silver : Colors.gold} />
    </Pressable>
  );
}

export function ExpectingDogCard({
  entry,
  detailRoute,
}: {
  entry: ExpectingDogEntry;
  detailRoute: string;
}) {
  return <DogDirectoryCard dog={entry.dog} detailRoute={detailRoute} expecting={entry} />;
}

export function DeceasedDogCard({
  dog,
  detailRoute,
}: {
  dog: KennelDog;
  detailRoute: string;
}) {
  return <DogDirectoryCard dog={dog} detailRoute={detailRoute} variant="deceased" />;
}

export function AlumniDogCard({
  dog,
  detailRoute,
}: {
  dog: KennelDog;
  detailRoute: string;
}) {
  return <DogDirectoryCard dog={dog} detailRoute={detailRoute} variant="alumni" />;
}
