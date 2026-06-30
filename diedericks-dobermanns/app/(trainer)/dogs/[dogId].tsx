import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { formatTrainerWhen } from '@/components/trainer/TrainerBookingCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { Config } from '@/constants/config';
import { requireSupabase } from '@/lib/supabase';
import { sessionMediaCaption, useTrainerDogHistory } from '@/hooks/useTrainer';
import type { DogMedia } from '@/types/app.types';

export default function TrainerDogProgressScreen() {
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const { sessions, loading } = useTrainerDogHistory(dogId ?? '');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [gallery, setGallery] = useState<DogMedia[]>([]);

  const heroDog = sessions[0]?.dog;
  const heroMedia = heroDog?.media?.find((m) => m.is_primary) ?? heroDog?.media?.[0];

  useEffect(() => {
    if (!dogId || sessions.length === 0) return;
    void (async () => {
      if (Config.isDemoMode) return;
      try {
        const supabase = requireSupabase();
        const captions = sessions.map((s) => sessionMediaCaption(s.id));
        const { data } = await supabase
          .from('dog_media')
          .select('id, dog_id, url, thumbnail_url, type, caption, uploaded_at')
          .eq('dog_id', dogId)
          .in('caption', captions);
        setGallery((data ?? []) as DogMedia[]);
      } catch {
        setGallery([]);
      }
    })();
  }, [dogId, sessions]);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Dog progress" title={heroDog?.name ?? 'Training history'} />

      <View className="px-6">
        <Card className="mb-6">
          <View className="mb-3 h-40 overflow-hidden rounded-xl bg-surface">
            {heroMedia?.url ? (
              <Image source={{ uri: heroMedia.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="paw" size={36} color={Colors.silver} />
              </View>
            )}
          </View>
          <Typography variant="subtitle">{heroDog?.name ?? 'Dog'}</Typography>
          <Typography variant="caption" className="mt-1 capitalize">
            {heroDog?.colour?.replace('_', ' ') ?? 'In training'}
          </Typography>
        </Card>

        <Typography variant="label" className="mb-3 text-gold">
          Completed sessions
        </Typography>
        {!loading && sessions.length === 0 ? (
          <Typography variant="bodyMuted">No completed sessions yet.</Typography>
        ) : (
          <View className="gap-3">
            {sessions.map((s) => {
              const open = expandedId === s.id;
              const sessionPhotos = gallery.filter((g) => g.caption === sessionMediaCaption(s.id));
              return (
                <Card key={s.id}>
                  <Pressable onPress={() => setExpandedId(open ? null : s.id)}>
                    <View className="flex-row items-center justify-between">
                      <Typography variant="body">{formatTrainerWhen(s.scheduled_at)}</Typography>
                      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.gold} />
                    </View>
                    <Typography variant="caption" className="mt-1">
                      {sessionPhotos.length} photo{sessionPhotos.length === 1 ? '' : 's'}
                    </Typography>
                  </Pressable>
                  {open ? (
                    <View className="mt-3 border-t border-gold/10 pt-3">
                      {s.trainer_notes ? (
                        <Typography variant="bodyMuted">{s.trainer_notes}</Typography>
                      ) : (
                        <Typography variant="caption" className="text-silver">
                          No notes recorded.
                        </Typography>
                      )}
                      {sessionPhotos.length ? (
                        <View className="mt-3 flex-row flex-wrap gap-2">
                          {sessionPhotos.map((p) => (
                            <View key={p.id} className="h-20 w-20 overflow-hidden rounded-lg bg-surface">
                              <Image
                                source={{ uri: p.thumbnail_url ?? p.url }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                              />
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
