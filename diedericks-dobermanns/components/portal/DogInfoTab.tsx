import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import type { ClientDogNotes } from '@/hooks/useClientDogNotes';
import { formatAge, titleCase } from '@/lib/format';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { requireSupabase } from '@/lib/supabase';
import type { Dog } from '@/types/app.types';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between border-b border-gold/10 py-3">
      <Typography variant="caption" className="text-subtle">
        {label}
      </Typography>
      <Typography variant="body" className="ml-4 flex-1 text-right">
        {value}
      </Typography>
    </View>
  );
}

interface DogInfoTabProps {
  dog: Dog;
  notes: ClientDogNotes | null;
  saving: boolean;
  onSave: (patch: {
    nickname?: string;
    vet_practice?: string;
    vet_name?: string;
    vet_phone?: string;
  }) => Promise<void>;
}

export function DogInfoTab({ dog, notes, saving, onSave }: DogInfoTabProps) {
  const [sireName, setSireName] = useState('—');
  const [damName, setDamName] = useState('—');
  const [nickname, setNickname] = useState(notes?.nickname ?? '');
  const [vetPractice, setVetPractice] = useState(notes?.vet_practice ?? '');
  const [vetName, setVetName] = useState(notes?.vet_name ?? '');
  const [vetPhone, setVetPhone] = useState(notes?.vet_phone ?? '');

  useEffect(() => {
    setNickname(notes?.nickname ?? '');
    setVetPractice(notes?.vet_practice ?? '');
    setVetName(notes?.vet_name ?? '');
    setVetPhone(notes?.vet_phone ?? '');
  }, [notes]);

  useEffect(() => {
    void (async () => {
      const ids = [dog.father_id, dog.mother_id].filter(Boolean) as string[];
      if (!ids.length) return;
      const { data } = await requireSupabase().from('dogs').select('id, name').in('id', ids);
      for (const row of data ?? []) {
        if (row.id === dog.father_id) setSireName(row.name);
        if (row.id === dog.mother_id) setDamName(row.name);
      }
    })();
  }, [dog.father_id, dog.mother_id]);

  return (
    <View className="px-6 pb-8">
      <Typography variant="label" className="mb-2 text-gold">
        DOG DETAILS
      </Typography>
      <Card className="mb-6">
        <DetailRow label="Registered Name" value={dog.name} />
        <DetailRow
          label="Call Name / Colour"
          value={`${dog.call_name ?? '—'} · ${titleCase(dog.colour)}`}
        />
        <DetailRow label="Sex" value={titleCase(dog.sex)} />
        <DetailRow label="Date of Birth" value={formatKennelDate(dog.date_of_birth)} />
        <DetailRow label="Age" value={formatAge(dog.date_of_birth)} />
        {dog.microchip_number ? (
          <DetailRow label="Microchip" value={dog.microchip_number} />
        ) : null}
        <DetailRow label="Sire" value={sireName} />
        <DetailRow label="Dam" value={damName} />
      </Card>

      <Typography variant="label" className="mb-2 text-gold">
        YOUR VET
      </Typography>
      <Card className="mb-4">
        <Input label="Practice Name" value={vetPractice} onChangeText={setVetPractice} />
        <Input label="Vet's Name" value={vetName} onChangeText={setVetName} className="mt-3" />
        <Input
          label="Phone"
          value={vetPhone}
          onChangeText={setVetPhone}
          keyboardType="phone-pad"
          className="mt-3"
        />
        <Button
          label="Save Vet Details"
          onPress={() =>
            void onSave({
              vet_practice: vetPractice.trim() || undefined,
              vet_name: vetName.trim() || undefined,
              vet_phone: vetPhone.trim() || undefined,
            })
          }
          loading={saving}
          className="mt-4"
          fullWidth
        />
      </Card>

      <Typography variant="label" className="mb-2 text-gold">
        YOUR NICKNAME
      </Typography>
      <Card>
        <Typography variant="caption" className="mb-2 text-subtle">
          What do you call {dog.name} at home?
        </Typography>
        <Input value={nickname} onChangeText={setNickname} placeholder="Nickname" />
        <Button
          label="Save Nickname"
          onPress={() => void onSave({ nickname: nickname.trim() || undefined })}
          loading={saving}
          className="mt-4"
          fullWidth
        />
      </Card>
    </View>
  );
}
