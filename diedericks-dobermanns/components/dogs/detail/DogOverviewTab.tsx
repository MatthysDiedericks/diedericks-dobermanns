import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { DetailRow } from '@/components/dogs/detail/DetailRow';
import { DogMeasurementsPanel } from '@/components/dogs/detail/DogMeasurementsPanel';
import { DogStandardPanel } from '@/components/dogs/detail/DogStandardPanel';
import { DogStatusPanel } from '@/components/dogs/detail/DogStatusPanel';
import { DogWeightPanel } from '@/components/dogs/detail/DogWeightPanel';
import { HeatStatusCard } from '@/components/dogs/detail/HeatStatusCard';
import { SectionCard } from '@/components/dogs/detail/SectionCard';
import { Button } from '@/components/ui/Button';
import { DogStatusBadge } from '@/components/dogs/DogStatusBadge';
import { formatDogAge } from '@/lib/kennel/formatters';
import { titleCase } from '@/lib/format';
import type { Dog } from '@/types/app.types';

export function DogOverviewTab({
  dog,
  onRefresh,
  canEdit,
}: {
  dog: Dog;
  onRefresh: () => void;
  canEdit: boolean;
}) {
  const router = useRouter();
  const photo =
    dog.media?.find((m) => m.is_primary)?.url ?? dog.media?.[0]?.url ?? null;

  return (
    <View className="pb-8">
      {photo ? (
        <Image
          source={{ uri: photo }}
          style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 16 }}
          contentFit="cover"
        />
      ) : null}

      <DogStatusPanel dog={dog} onStatusChanged={onRefresh} />

      <DogStandardPanel dog={dog} canEdit={canEdit} onSaved={onRefresh} />
      <HeatStatusCard dog={dog} onRefresh={onRefresh} />
      <DogMeasurementsPanel dog={dog} canEdit={canEdit} onSaved={onRefresh} />
      <DogWeightPanel dog={dog} canEdit={canEdit} onSaved={onRefresh} />

      <SectionCard title="General">
        <DetailRow label="Name" value={dog.name} />
        <DetailRow label="Registered name" value={dog.registered_name} />
        <DetailRow label="Call name" value={dog.call_name} />
        <DetailRow label="Breed" value={dog.breed} />
        <DetailRow label="Sex" value={dog.sex ? titleCase(dog.sex) : null} />
        <DetailRow label="Date of birth" value={dog.date_of_birth} />
        <DetailRow label="Age" value={formatDogAge(dog.date_of_birth)} />
        <DetailRow label="Location" value={dog.location} />
      </SectionCard>

      <SectionCard title="Identifiers">
        <DetailRow label="Microchip" value={dog.microchip_number} mono />
        <DetailRow label="Tattoo" value={dog.tattoo_number} mono />
        <DetailRow label="Passport" value={dog.passport_number} mono />
        <DetailRow label="DNA" value={dog.dna_number} mono />
        <DetailRow label="Insurance" value={dog.insurance_number} mono />
        <DetailRow label="Registration" value={dog.registration_number} mono />
        <DetailRow label="Reg. type" value={dog.registration_type} />
      </SectionCard>

      <SectionCard title="Physical">
        <DetailRow label="Colour" value={dog.colour ? titleCase(dog.colour) : null} />
        <DetailRow label="Coat" value={dog.coat_type} />
        <DetailRow label="Height (cm)" value={dog.height_cm} />
        <DetailRow label="Ear type" value={dog.ear_type ? titleCase(dog.ear_type) : null} />
        <DetailRow label="Eye colour" value={dog.eye_colour} />
      </SectionCard>

      <SectionCard title="Status">
        <View className="mb-2">
          <DogStatusBadge status={dog.status} />
        </View>
        <DetailRow label="Category" value={dog.category ? titleCase(dog.category) : null} />
        <DetailRow label="Spayed / neutered" value={dog.is_spayed_neutered ? 'Yes' : 'No'} />
        <DetailRow label="Public" value={dog.is_public ? 'Yes' : 'No'} />
        <DetailRow label="Featured" value={dog.is_featured ? 'Yes' : 'No'} />
      </SectionCard>

      <SectionCard title="Genetics">
        <DetailRow label="Wright's COI" value={dog.wrights_coi != null ? `${dog.wrights_coi}%` : null} />
        <DetailRow label="B locus" value={dog.genetics_b_locus} />
        <DetailRow label="D locus" value={dog.genetics_d_locus} />
        <DetailRow label="vWD" value={dog.genetics_vwd_status} />
        <DetailRow label="DCM1" value={dog.genetics_dcm1_status} />
        <DetailRow label="DCM2" value={dog.genetics_dcm2_status} />
        <DetailRow label="Notes" value={dog.genetics_notes} />
      </SectionCard>

      <SectionCard title="Notes">
        <DetailRow label="Temperament" value={dog.temperament_notes} />
        <DetailRow label="Training" value={dog.training_notes} />
      </SectionCard>

        <Button
          label="Edit Profile"
          onPress={() => router.push(`/(admin)/dogs/${dog.id}/edit` as never)}
          fullWidth
          className="mb-3"
        />
        {dog.sex === 'female' ? (
          <Button
            label="Litter History"
            variant="outline"
            onPress={() => router.push(`/(admin)/dogs/${dog.id}/litter-history` as never)}
            fullWidth
          />
        ) : null}
    </View>
  );
}
