import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { CollarDot, collarLabel } from '@/lib/litters/collarColours';
import { titleCase } from '@/lib/format';
import { formatPuppyAge, formatWeight } from '@/lib/kennel/formatters';
import type { Dog } from '@/types/app.types';

export function LitterPuppiesTab({
  litterId,
  puppies,
}: {
  litterId: string;
  puppies: Dog[];
}) {
  const router = useRouter();

  return (
    <View className="pb-8">
      <Button
        label="Register More Pups"
        onPress={() => router.push(`/(admin)/litters/${litterId}/register-pups` as never)}
        fullWidth
        className="mb-4"
      />
      <View className="gap-3">
        {puppies.map((p) => {
          const ext = p as Dog & { birth_weight_grams?: number | null; collar_colour?: string | null };
          return (
            <Pressable key={p.id} onPress={() => router.push(`/(admin)/dogs/${p.id}` as never)}>
              <Card className="flex-row items-center">
                <CollarDot colour={ext.collar_colour} />
                <View className="ml-3 flex-1">
                  <Typography variant="subtitle">
                    {p.sex === 'male' ? '♂' : '♀'} {p.name}
                  </Typography>
                  <Typography variant="caption">
                    {p.colour} · {titleCase(p.status ?? '')} · {collarLabel(ext.collar_colour)}
                  </Typography>
                  {ext.birth_weight_grams ? (
                    <Typography variant="caption" className="text-subtle">
                      Birth {formatWeight(ext.birth_weight_grams / 1000)} · {formatPuppyAge(p.date_of_birth)}
                    </Typography>
                  ) : null}
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
