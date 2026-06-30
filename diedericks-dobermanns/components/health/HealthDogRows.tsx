import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { HealthDueChip } from '@/components/health/HealthDueChip';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { HealthDog } from '@/lib/health/types';
import { formatKennelDate } from '@/lib/kennel/formatters';

function DogThumb({ dog }: { dog: HealthDog }) {
  return (
    <View className="mr-3 h-12 w-12 overflow-hidden rounded-xl bg-black-rich">
      {dog.photoUrl ? (
        <Image source={{ uri: dog.photoUrl }} style={{ width: 48, height: 48 }} contentFit="cover" />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="paw" size={18} color={Colors.gold} />
        </View>
      )}
    </View>
  );
}

export function VaccinationDogRow({
  dog,
  lastVaccine,
  lastDate,
  nextDue,
  onPress,
}: {
  dog: HealthDog;
  lastVaccine: string | null;
  lastDate: string | null;
  nextDue: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="mb-2 flex-row items-center rounded-lg border border-gold/10 bg-black-rich/40 p-3">
      <DogThumb dog={dog} />
      <View className="flex-1">
        <Typography variant="body">{dog.name}</Typography>
        <Typography variant="caption" className="text-muted">
          {lastVaccine ? `${lastVaccine} · ${formatKennelDate(lastDate)}` : 'No vaccinations recorded'}
        </Typography>
      </View>
      <HealthDueChip nextDue={nextDue} />
    </Pressable>
  );
}

export function DewormingDogRow({
  dog,
  lastDewormDate,
  lastTickFleaDate,
  nextDewormDue,
  nextTickFleaDue,
  onPress,
}: {
  dog: HealthDog;
  lastDewormDate: string | null;
  lastTickFleaDate: string | null;
  nextDewormDue: string | null;
  nextTickFleaDue: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="mb-2 flex-row items-center rounded-lg border border-gold/10 bg-black-rich/40 p-3">
      <DogThumb dog={dog} />
      <View className="flex-1">
        <Typography variant="body">{dog.name}</Typography>
        <View className="mt-1 flex-row flex-wrap gap-2">
          <View className="rounded border border-gold/15 px-2 py-0.5">
            <Typography variant="caption" style={{ fontSize: 10 }}>
              DEWORM {lastDewormDate ? formatKennelDate(lastDewormDate) : '—'}
            </Typography>
          </View>
          <View className="rounded border border-gold/15 px-2 py-0.5">
            <Typography variant="caption" style={{ fontSize: 10 }}>
              TICK & FLEA {lastTickFleaDate ? formatKennelDate(lastTickFleaDate) : '—'}
            </Typography>
          </View>
        </View>
      </View>
      <View className="items-end gap-1">
        <HealthDueChip nextDue={nextDewormDue} />
      </View>
    </Pressable>
  );
}

export function VetVisitDogRow({
  dog,
  lastVisitDate,
  lastReason,
  nextDue,
  onPress,
}: {
  dog: HealthDog;
  lastVisitDate: string | null;
  lastReason: string | null;
  nextDue: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="mb-2 flex-row items-center rounded-lg border border-gold/10 bg-black-rich/40 p-3">
      <DogThumb dog={dog} />
      <View className="flex-1">
        <Typography variant="body">{dog.name}</Typography>
        <Typography variant="caption" className="text-muted" numberOfLines={1}>
          {lastVisitDate ? `${formatKennelDate(lastVisitDate)} · ${lastReason ?? 'Visit'}` : 'No visits recorded'}
        </Typography>
      </View>
      <HealthDueChip nextDue={nextDue} />
    </Pressable>
  );
}
