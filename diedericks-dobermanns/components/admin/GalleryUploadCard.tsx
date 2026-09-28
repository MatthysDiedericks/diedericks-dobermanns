import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AddDogMediaCard } from '@/components/admin/AddDogMediaCard';
import {
  DESTINATIONS,
  GALLERY_CATEGORIES,
  LITTER_CATEGORIES,
  litterPickerLabel,
  type Destination,
  type LitterPickerOption,
} from '@/components/admin/galleryOptions';
import { DogGroupPickerField, type DogPickerOption } from '@/components/forms/DogGroupPickerField';
import { PhotoPicker } from '@/components/forms/PhotoPicker';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { addGalleryItem, updateGalleryItem, useSubmitting } from '@/hooks/useMutations';
import { ANNOUNCEMENT_CATEGORY, announcementWriteError } from '@/lib/litters/announcement';
import { resolvePhotoUrls, storagePathFromPublicUrl } from '@/lib/storage';
import { quickCaptureTimelineMedia } from '@/lib/training/journeyMutations';
import type { GalleryItem } from '@/types/app.types';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function GalleryUploadCard({
  dogs,
  dogId,
  onDogIdChange,
  litters,
  items,
  onUploaded,
}: {
  dogs: DogPickerOption[];
  dogId: string | null;
  onDogIdChange: (id: string | null) => void;
  litters: LitterPickerOption[];
  items: GalleryItem[];
  onUploaded?: () => void;
}) {
  const { submitting, run } = useSubmitting();
  const [destination, setDestination] = useState<Destination>('dog');
  const [category, setCategory] = useState(GALLERY_CATEGORIES[0].value);
  const [litterId, setLitterId] = useState<string | null>(null);
  const [replace, setReplace] = useState(false);
  const [sessionDate, setSessionDate] = useState(todayIso());
  const [photos, setPhotos] = useState<string[]>([]);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [dates, setDates] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedLitter = litters.find((l) => l.id === litterId) ?? null;
  const existingAnnouncement = useMemo(() => {
    if (!litterId) return null;
    return (
      items.find((g) => g.category === ANNOUNCEMENT_CATEGORY && g.litter_id === litterId) ?? null
    );
  }, [items, litterId]);

  const announcementBlocked =
    destination === 'litter' &&
    category === ANNOUNCEMENT_CATEGORY &&
    Boolean(existingAnnouncement) &&
    !replace;

  function setDest(next: Destination) {
    setDestination(next);
    setError(null);
    setSuccess(null);
    setReplace(false);
    if (next === 'litter') setCategory(ANNOUNCEMENT_CATEGORY);
    if (next === 'gallery') setCategory(GALLERY_CATEGORIES[0].value);
  }

  async function submitLitterOrGallery() {
    setError(null);
    setSuccess(null);
    if (photos.length === 0) {
      setError('Add at least one photo.');
      return;
    }
    if (destination === 'litter' && !litterId) {
      setError('Choose a litter before uploading.');
      return;
    }
    if (announcementBlocked) {
      setError('This litter already has an announcement poster. Choose Replace to overwrite it.');
      return;
    }
    const folder =
      destination === 'litter' && litterId ? `litters/${litterId}` : 'gallery';
    const urls = await resolvePhotoUrls(photos, folder, 'gallery');
    for (let i = 0; i < urls.length; i++) {
      const uri = photos[i];
      const title =
        destination === 'litter' && selectedLitter ? litterPickerLabel(selectedLitter) : null;
      const payload = {
        title,
        category: destination === 'litter' ? category : category,
        description: captions[uri]?.trim() || null,
        image_url: urls[i],
        photo_taken_at: dates[uri] || null,
        litter_id: destination === 'litter' ? litterId : null,
      };
      if (
        destination === 'litter' &&
        category === ANNOUNCEMENT_CATEGORY &&
        existingAnnouncement &&
        replace
      ) {
        const { error: err } = await run(() =>
          updateGalleryItem(existingAnnouncement.id, payload),
        );
        if (err) {
          setError(announcementWriteError({ message: err }));
          return;
        }
      } else {
        const { error: err } = await run(() => addGalleryItem(payload));
        if (err) {
          setError(announcementWriteError({ message: err }));
          return;
        }
      }
    }
    setPhotos([]);
    setCaptions({});
    setDates({});
    setSuccess(`Added ${urls.length} file${urls.length === 1 ? '' : 's'}.`);
    onUploaded?.();
  }

  async function submitTimeline() {
    setError(null);
    setSuccess(null);
    if (!dogId) {
      setError('Choose a dog before uploading to the timeline.');
      return;
    }
    if (photos.length === 0) {
      setError('Add at least one photo.');
      return;
    }
    const urls = await resolvePhotoUrls(photos, `training-journey/${dogId}`, 'gallery');
    for (let i = 0; i < urls.length; i++) {
      const uri = photos[i];
      const stored = storagePathFromPublicUrl(urls[i], 'gallery') ?? urls[i];
      const { error: err } = await run(async () => {
        const out = await quickCaptureTimelineMedia({
          dogId,
          sessionDate,
          url: urls[i],
          storagePath: stored,
          caption: captions[uri]?.trim() || null,
        });
        return { error: 'error' in out ? out.error : null };
      });
      if (err) {
        setError(err);
        return;
      }
    }
    setPhotos([]);
    setCaptions({});
    setSuccess(`Added ${urls.length} file${urls.length === 1 ? '' : 's'} to the timeline draft.`);
    onUploaded?.();
  }

  return (
    <View className="mb-6 rounded-2xl border border-gold/20 bg-surface p-4">
      <Typography variant="subtitle" className="mb-3 text-gold">
        Add Media
      </Typography>

      <View className="mb-3 flex-row flex-wrap gap-2">
        {DESTINATIONS.map((d) => (
          <Pressable
            key={d.value}
            onPress={() => setDest(d.value)}
            className={`rounded-full border px-3 py-1.5 ${
              destination === d.value ? 'border-gold bg-gold/15' : 'border-gold/20'
            }`}
          >
            <Typography
              variant="caption"
              className={destination === d.value ? 'text-gold' : 'text-silver'}
            >
              {d.label}
            </Typography>
          </Pressable>
        ))}
      </View>

      {destination === 'dog' ? (
        <AddDogMediaCard
          dogs={dogs}
          dogId={dogId}
          onDogIdChange={onDogIdChange}
          onUploaded={onUploaded}
        />
      ) : null}

      {destination === 'gallery' ? (
        <View className="mb-3 flex-row flex-wrap gap-2">
          {GALLERY_CATEGORIES.map((c) => (
            <Pressable
              key={c.value}
              onPress={() => setCategory(c.value)}
              className={`rounded-full border px-3 py-1.5 ${
                category === c.value ? 'border-gold bg-gold/15' : 'border-gold/20'
              }`}
            >
              <Typography
                variant="caption"
                className={category === c.value ? 'text-gold' : 'text-silver'}
              >
                {c.label}
              </Typography>
            </Pressable>
          ))}
        </View>
      ) : null}

      {destination === 'litter' ? (
        <View>
          <Typography variant="caption" className="mb-2 text-silver">
            Litter
          </Typography>
          <View className="mb-3 flex-row flex-wrap gap-2">
            {litters.map((l) => (
              <Pressable
                key={l.id}
                onPress={() => {
                  setLitterId(l.id);
                  setReplace(false);
                }}
                className={`rounded-full border px-3 py-1.5 ${
                  litterId === l.id ? 'border-gold bg-gold/15' : 'border-gold/20'
                }`}
              >
                <Typography
                  variant="caption"
                  className={litterId === l.id ? 'text-gold' : 'text-silver'}
                >
                  {litterPickerLabel(l)} · {l.status}
                </Typography>
              </Pressable>
            ))}
          </View>
          {selectedLitter && !selectedLitter.is_public ? (
            <Typography variant="caption" className="mb-3 text-gold">
              This litter is not on the website yet — the poster will stay private until you
              publish it.
            </Typography>
          ) : null}
          <View className="mb-3 flex-row flex-wrap gap-2">
            {LITTER_CATEGORIES.map((c) => (
              <Pressable
                key={c.value}
                onPress={() => setCategory(c.value)}
                className={`rounded-full border px-3 py-1.5 ${
                  category === c.value ? 'border-gold bg-gold/15' : 'border-gold/20'
                }`}
              >
                <Typography
                  variant="caption"
                  className={category === c.value ? 'text-gold' : 'text-silver'}
                >
                  {c.label}
                </Typography>
              </Pressable>
            ))}
          </View>
          {existingAnnouncement && category === ANNOUNCEMENT_CATEGORY ? (
            <View className="mb-3">
              <Typography variant="caption" className="mb-2 text-silver">
                This litter already has an announcement poster
                {existingAnnouncement.title ? ` (“${existingAnnouncement.title}”).` : '.'} Upload
                will replace it rather than add a second one.
              </Typography>
              <Checkbox
                checked={replace}
                onChange={setReplace}
                label="Replace the existing poster"
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {destination === 'timeline' ? (
        <View className="mb-3">
          <DogGroupPickerField
            label="Dog"
            value={dogId}
            onChange={onDogIdChange}
            dogs={dogs}
            placeholder="Choose a dog…"
          />
          <Input label="Session date" value={sessionDate} onChangeText={setSessionDate} placeholder="YYYY-MM-DD" />
        </View>
      ) : null}

      {destination !== 'dog' ? (
        <>
          <Typography variant="caption" className="mb-2 text-silver">
            Photos
          </Typography>
          <PhotoPicker
            value={photos}
            onChange={(next) => {
              setPhotos(next);
              setCaptions((prev) => {
                const keep: Record<string, string> = {};
                for (const uri of next) if (prev[uri]) keep[uri] = prev[uri];
                return keep;
              });
            }}
            max={5}
          />
          {photos.map((uri, i) => (
            <View key={uri}>
              <Input
                label={photos.length > 1 ? `Caption · photo ${i + 1}` : 'Caption'}
                value={captions[uri] ?? ''}
                onChangeText={(text) => setCaptions((prev) => ({ ...prev, [uri]: text }))}
                placeholder="What is happening in this photo"
              />
              <Input
                label="Date taken"
                value={dates[uri] ?? ''}
                onChangeText={(text) => setDates((prev) => ({ ...prev, [uri]: text }))}
                placeholder="YYYY-MM-DD"
              />
            </View>
          ))}
          {error ? (
            <Typography variant="caption" className="mt-2 text-danger">
              {error}
            </Typography>
          ) : null}
          {success ? (
            <Typography variant="caption" className="mt-2 text-gold">
              {success}
            </Typography>
          ) : null}
          <Button
            label={submitting ? 'Uploading…' : 'Upload'}
            onPress={() =>
              void (destination === 'timeline' ? submitTimeline() : submitLitterOrGallery())
            }
            loading={submitting}
            disabled={announcementBlocked}
            fullWidth
            className="mt-3"
          />
        </>
      ) : null}
    </View>
  );
}
