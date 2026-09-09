import { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { addCustomSkill, addSkillToLibrary, pasteSkillList } from '@/lib/protection/dogWrites';
import { showSaved } from '@/lib/dogDetail/feedback';
import type { DogSkillRow, SkillLibraryRow } from '@/lib/protection/types';

export function ProtectionFreeText({
  dogId,
  discipline,
  onAdded,
  onLibrary,
}: {
  dogId: string;
  discipline: string;
  onAdded: (skillId: string) => void;
  onLibrary: (row: SkillLibraryRow) => void;
}) {
  const [customLabel, setCustomLabel] = useState('');
  const [paste, setPaste] = useState('');
  const [offerId, setOfferId] = useState<string | null>(null);
  const [offerLabel, setOfferLabel] = useState('');

  return (
    <View className="gap-3">
      <TextInput
        className="rounded-sm border border-gold/25 px-3 py-2 text-text"
        placeholder="Skill not in the library"
        placeholderTextColor="#A8A090"
        value={customLabel}
        onChangeText={setCustomLabel}
      />
      <Button
        label="Add"
        variant="outline"
        onPress={() => {
          void addCustomSkill({ dogId, discipline, label: customLabel })
            .then((id) => {
              setOfferId(id);
              setOfferLabel(customLabel.trim());
              setCustomLabel('');
              onAdded(id);
              showSaved('Saved');
            })
            .catch((e) => Alert.alert('Could not add', e.message));
        }}
      />
      {offerId ? (
        <Pressable
          onPress={() =>
            void addSkillToLibrary(dogId, offerId)
              .then((libraryId) => {
                onLibrary({
                  id: libraryId,
                  discipline,
                  label: offerLabel,
                  detail: null,
                  default_conditions: [],
                  sort_order: 0,
                  is_active: true,
                });
                setOfferId(null);
                setOfferLabel('');
                showSaved('Added to library');
              })
              .catch((e) => Alert.alert('Could not add', e.message))
          }
        >
          <Typography className="text-gold">Add to library?</Typography>
        </Pressable>
      ) : null}
      <TextInput
        multiline
        className="min-h-[72px] rounded-sm border border-gold/25 px-3 py-2 text-text"
        placeholder="Paste a list — one skill per line"
        placeholderTextColor="#A8A090"
        value={paste}
        onChangeText={setPaste}
      />
      <Button
        label={`Paste into ${discipline}`}
        variant="outline"
        onPress={() => {
          void pasteSkillList(dogId, discipline, paste)
            .then(() => {
              setPaste('');
              onAdded('');
              showSaved('Saved');
            })
            .catch((e) => Alert.alert('Could not paste', e.message));
        }}
      />
    </View>
  );
}
