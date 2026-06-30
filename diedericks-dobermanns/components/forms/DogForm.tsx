import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { ControlledInput, OptionGroup, ToggleRow } from '@/components/forms/fields';
import { DogFormExtendedFields } from '@/components/forms/DogFormExtendedFields';
import { MediaUploader, type UploaderValue } from '@/components/forms/MediaUploader';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { replaceDogMedia, saveDog, useSubmitting } from '@/hooks/useMutations';
import type { Dog, DogCategory } from '@/types/app.types';
import type { TablesInsert } from '@/types/database.types';

const dogSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  call_name: z.string(),
  location: z.string(),
  tattoo_number: z.string(),
  passport_number: z.string(),
  dna_number: z.string(),
  insurance_number: z.string(),
  registration_type: z.string(),
  coat_type: z.string(),
  height_cm: z.string(),
  ear_type: z.union([z.literal(''), z.enum(['natural', 'cropped', 'unknown'])]),
  eye_colour: z.string(),
  is_spayed_neutered: z.boolean(),
  wrights_coi: z.string(),
  category: z.enum(['puppy', 'adult', 'breeding_stock', 'training_dog']),
  status: z.enum([
    'available',
    'reserved',
    'sold',
    'donated',
    'gifted',
    'keep',
    'stud',
    'in_training',
    'breeding_stock',
    'deceased',
    'retired',
    'puppy',
  ]),
  sex: z.union([z.literal(''), z.enum(['male', 'female'])]),
  colour: z.union([
    z.literal(''),
    z.enum(['black/rust', 'blue/rust', 'fawn/rust', 'red/rust']),
  ]),
  bloodline: z.union([
    z.literal(''),
    z.enum(['altobello', 'dominator', 'quantum', 'american', 'kennel_own']),
  ]),
  dcm_status: z.union([z.literal(''), z.enum(['clear', 'carrier', 'affected'])]),
  date_of_birth: z.string(),
  price: z.string(),
  hip_score: z.string(),
  elbow_score: z.string(),
  description: z.string(),
  temperament_notes: z.string(),
  training_notes: z.string(),
  health_tested: z.boolean(),
  is_featured: z.boolean(),
  is_public: z.boolean(),
});

type DogFormValues = z.infer<typeof dogSchema>;

export type { DogFormValues };

function toDefaults(dog?: Dog, defaultCategory?: DogCategory): DogFormValues {
  return {
    name: dog?.name ?? '',
    call_name: dog?.call_name ?? '',
    location: dog?.location ?? '',
    tattoo_number: dog?.tattoo_number ?? '',
    passport_number: dog?.passport_number ?? '',
    dna_number: dog?.dna_number ?? '',
    insurance_number: dog?.insurance_number ?? '',
    registration_type: dog?.registration_type ?? '',
    coat_type: dog?.coat_type ?? '',
    height_cm: dog?.height_cm != null ? String(dog.height_cm) : '',
    ear_type: dog?.ear_type ?? '',
    eye_colour: dog?.eye_colour ?? '',
    is_spayed_neutered: dog?.is_spayed_neutered ?? false,
    wrights_coi: dog?.wrights_coi != null ? String(dog.wrights_coi) : '',
    category: dog?.category ?? defaultCategory ?? 'puppy',
    status: dog?.status ?? 'available',
    sex: dog?.sex ?? '',
    colour: dog?.colour ?? '',
    bloodline: dog?.bloodline ?? '',
    dcm_status: dog?.dcm_status ?? '',
    date_of_birth: dog?.date_of_birth ?? '',
    price: dog?.price != null ? String(dog.price) : '',
    hip_score: dog?.hip_score ?? '',
    elbow_score: dog?.elbow_score ?? '',
    description: dog?.description ?? '',
    temperament_notes: dog?.temperament_notes ?? '',
    training_notes: dog?.training_notes ?? '',
    health_tested: dog?.health_tested ?? false,
    is_featured: dog?.is_featured ?? false,
    is_public: dog?.is_public ?? true,
  };
}

interface DogFormProps {
  dog?: Dog;
  defaultCategory?: DogCategory;
  onSaved: () => void;
}

/** Builds the initial uploader values from a dog's existing media (cover first). */
function initialMedia(dog: Dog | undefined, type: 'photo' | 'video'): UploaderValue[] {
  const media = (dog?.media ?? [])
    .filter((m) => m.type === type)
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
  return media.map((m) => ({ url: m.url, kind: type === 'video' ? 'video' : 'image' }));
}

export function DogForm({ dog, defaultCategory, onSaved }: DogFormProps) {
  const { control, handleSubmit } = useForm<DogFormValues>({
    resolver: zodResolver(dogSchema),
    defaultValues: toDefaults(dog, defaultCategory),
  });
  const { submitting, run } = useSubmitting();
  const blank = (v: string) => (v.trim() ? v.trim() : null);

  const [photos, setPhotos] = useState<UploaderValue[]>(() => initialMedia(dog, 'photo'));
  const [videos, setVideos] = useState<UploaderValue[]>(() => initialMedia(dog, 'video'));

  async function onValid(values: DogFormValues) {
    const priceNum = values.price.trim() ? Number(values.price) : null;
    const heightNum = values.height_cm.trim() ? Number(values.height_cm) : null;
    const coiNum = values.wrights_coi.trim() ? Number(values.wrights_coi) : null;
    const payload: TablesInsert<'dogs'> = {
      name: values.name.trim(),
      call_name: blank(values.call_name),
      location: blank(values.location),
      tattoo_number: blank(values.tattoo_number),
      passport_number: blank(values.passport_number),
      dna_number: blank(values.dna_number),
      insurance_number: blank(values.insurance_number),
      registration_type: blank(values.registration_type),
      coat_type: blank(values.coat_type),
      height_cm: heightNum != null && Number.isFinite(heightNum) ? heightNum : null,
      ear_type: values.ear_type || null,
      eye_colour: blank(values.eye_colour),
      is_spayed_neutered: values.is_spayed_neutered,
      wrights_coi: coiNum != null && Number.isFinite(coiNum) ? coiNum : null,
      category: values.category,
      status: values.status,
      sex: values.sex || null,
      colour: values.colour || null,
      bloodline: values.bloodline || null,
      dcm_status: values.dcm_status || null,
      date_of_birth: blank(values.date_of_birth),
      price: priceNum != null && Number.isFinite(priceNum) ? priceNum : null,
      hip_score: blank(values.hip_score),
      elbow_score: blank(values.elbow_score),
      description: blank(values.description),
      temperament_notes: blank(values.temperament_notes),
      training_notes: blank(values.training_notes),
      health_tested: values.health_tested,
      is_featured: values.is_featured,
      is_public: values.is_public,
    };

    const result = await run(() => saveDog(payload, dog?.id));
    if (result.error) return;
    if (result.id) {
      // Photos first so the cover (first photo) becomes the primary thumbnail.
      await replaceDogMedia(result.id, [...photos, ...videos]);
    }
    onSaved();
  }

  return (
    <View>
      <ControlledInput control={control} name="name" label="Name" autoCapitalize="words" />
      <DogFormExtendedFields control={control} />

      <Typography variant="label" className="mb-2 mt-2">
        Photos (up to 20 · first is the cover)
      </Typography>
      <View className="mb-4">
        <MediaUploader
          value={photos}
          onChange={setPhotos}
          bucket="dog-media"
          folder={dog?.id ?? 'new'}
          kinds={['image']}
          max={20}
        />
      </View>

      <Typography variant="label" className="mb-2 mt-2">
        Videos (up to 10)
      </Typography>
      <View className="mb-4">
        <MediaUploader
          value={videos}
          onChange={setVideos}
          bucket="dog-media"
          folder={dog?.id ?? 'new'}
          kinds={['video']}
          max={10}
        />
      </View>

      <OptionGroup
        control={control}
        name="category"
        label="Category"
        options={[
          { value: 'puppy', label: 'Puppy' },
          { value: 'adult', label: 'Adult' },
          { value: 'training_dog', label: 'Training Dog' },
          { value: 'breeding_stock', label: 'Breeding Stock' },
        ]}
      />
      <OptionGroup
        control={control}
        name="status"
        label="Status"
        options={[
          { value: 'keep', label: 'Breeding Female' },
          { value: 'stud', label: 'Stud' },
          { value: 'deceased', label: 'In Memory' },
          { value: 'sold', label: 'Alumni / Placed' },
          { value: 'in_training', label: 'In Training' },
          { value: 'puppy', label: 'Puppy' },
          { value: 'retired', label: 'Retired' },
          { value: 'available', label: 'Available' },
          { value: 'reserved', label: 'Reserved' },
        ]}
      />
      <OptionGroup
        control={control}
        name="sex"
        label="Sex"
        options={[
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
        ]}
      />
      <OptionGroup
        control={control}
        name="colour"
        label="Colour"
        options={[
          { value: 'black/rust', label: 'Black/Rust' },
          { value: 'blue/rust', label: 'Blue/Rust' },
          { value: 'fawn/rust', label: 'Fawn/Rust' },
          { value: 'red/rust', label: 'Red/Rust' },
        ]}
      />
      <OptionGroup
        control={control}
        name="bloodline"
        label="Bloodline"
        options={[
          { value: 'altobello', label: 'Altobello' },
          { value: 'dominator', label: 'Dominator' },
          { value: 'quantum', label: 'Quantum' },
          { value: 'american', label: 'American' },
          { value: 'kennel_own', label: 'Kennel Own' },
        ]}
      />

      <ControlledInput control={control} name="date_of_birth" label="Date of birth (YYYY-MM-DD)" placeholder="2025-01-01" autoCapitalize="none" />
      <ControlledInput control={control} name="price" label="Price (ZAR)" keyboardType="phone-pad" />

      <Typography variant="label" className="mb-2 mt-2">
        Health
      </Typography>
      <ToggleRow control={control} name="health_tested" label="Health tested" />
      <ControlledInput control={control} name="hip_score" label="Hip score (HD)" autoCapitalize="none" />
      <ControlledInput control={control} name="elbow_score" label="Elbow score (ED)" autoCapitalize="none" />
      <OptionGroup
        control={control}
        name="dcm_status"
        label="DCM status"
        options={[
          { value: 'clear', label: 'Clear' },
          { value: 'carrier', label: 'Carrier' },
          { value: 'affected', label: 'Affected' },
        ]}
      />

      <ControlledInput control={control} name="description" label="Description" multiline />
      <ControlledInput control={control} name="temperament_notes" label="Temperament notes" multiline />
      <ControlledInput control={control} name="training_notes" label="Training notes" multiline />

      <ToggleRow control={control} name="is_featured" label="Featured on home screen" />
      <ToggleRow control={control} name="is_public" label="Publicly visible" />

      <Button
        label={dog ? 'Save Changes' : 'Create Dog'}
        onPress={handleSubmit(onValid)}
        loading={submitting}
        fullWidth
        className="mt-4"
      />
    </View>
  );
}
