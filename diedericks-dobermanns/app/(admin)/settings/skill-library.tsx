import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import {
  collectDisciplines,
  disciplineLabel,
  isLibrarySkill,
  librarySkillsFor,
} from '@/lib/protection/constants';
import {
  addDiscipline,
  addLibrarySkill,
  renameLibrarySkill,
  reorderLibrarySkills,
  retireLibrarySkill,
} from '@/lib/protection/libraryWrites';
import { fetchSkillLibrary } from '@/lib/protection/queries';
import type { SkillLibraryRow } from '@/lib/protection/types';

export default function SkillLibrarySettingsScreen() {
  const [items, setItems] = useState<SkillLibraryRow[]>([]);
  const [discipline, setDiscipline] = useState('');
  const [label, setLabel] = useState('');
  const [newDiscipline, setNewDiscipline] = useState('');

  const reload = useCallback(async () => {
    setItems(await fetchSkillLibrary({ includeInactive: true }));
  }, []);

  useEffect(() => {
    void reload().catch((e) => Alert.alert('Could not load library', e.message));
  }, [reload]);

  const disciplines = useMemo(() => collectDisciplines(items, []), [items]);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Admin" title="Skill library" />
      <View className="gap-4 px-6 pb-10">
        <Typography variant="bodyMuted">
          Retiring a skill leaves every dog that already has it unchanged.
        </Typography>
        <TextInput
          className="rounded-sm border border-gold/25 px-3 py-2 text-text"
          placeholder="New discipline"
          placeholderTextColor="#A8A090"
          value={newDiscipline}
          onChangeText={setNewDiscipline}
        />
        <Button
          label="Add discipline"
          variant="outline"
          onPress={() =>
            void addDiscipline(newDiscipline)
              .then(() => {
                setNewDiscipline('');
                return reload();
              })
              .catch((e) => Alert.alert('Could not add', e.message))
          }
        />
        <TextInput
          className="rounded-sm border border-gold/25 px-3 py-2 text-text"
          placeholder="Discipline"
          placeholderTextColor="#A8A090"
          value={discipline}
          onChangeText={setDiscipline}
        />
        <TextInput
          className="rounded-sm border border-gold/25 px-3 py-2 text-text"
          placeholder="Skill name"
          placeholderTextColor="#A8A090"
          value={label}
          onChangeText={setLabel}
        />
        <Button
          label="Add skill"
          onPress={() =>
            void addLibrarySkill({ discipline, label })
              .then(() => {
                setLabel('');
                return reload();
              })
              .catch((e) => Alert.alert('Could not add', e.message))
          }
        />
        {disciplines.map((d) => {
          const rows = librarySkillsFor(items, d);
          return (
            <View key={d} className="gap-2">
              <Typography variant="subtitle" className="text-gold">
                {disciplineLabel(d)}
              </Typography>
              {rows.length === 0 ? (
                <Typography variant="bodyMuted">No skills yet.</Typography>
              ) : (
                rows.map((row, i) => (
                  <View
                    key={row.id}
                    className="flex-row items-center justify-between rounded-sm border border-gold/15 p-3"
                  >
                    <TextInput
                      className="flex-1 text-text"
                      defaultValue={row.label}
                      editable={isLibrarySkill(row.label)}
                      onEndEditing={(e) => {
                        const next = e.nativeEvent.text.trim();
                        if (next && next !== row.label) {
                          void renameLibrarySkill(row.id, next).catch((err) =>
                            Alert.alert('Could not rename', err.message),
                          );
                        }
                      }}
                    />
                    <Pressable
                      onPress={() => {
                        if (i === 0) return;
                        const ids = rows.map((r) => r.id);
                        const swap = ids[i - 1]!;
                        ids[i - 1] = row.id;
                        ids[i] = swap;
                        void reorderLibrarySkills(ids).then(reload);
                      }}
                    >
                      <Typography variant="caption">↑</Typography>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        if (i === rows.length - 1) return;
                        const ids = rows.map((r) => r.id);
                        const swap = ids[i + 1]!;
                        ids[i + 1] = row.id;
                        ids[i] = swap;
                        void reorderLibrarySkills(ids).then(reload);
                      }}
                    >
                      <Typography variant="caption">↓</Typography>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        void retireLibrarySkill(row.id, !row.is_active)
                          .then(reload)
                          .catch((e) => Alert.alert('Could not update', e.message))
                      }
                    >
                      <Typography variant="caption" className="text-gold">
                        {row.is_active ? 'Retire' : 'Restore'}
                      </Typography>
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          );
        })}
      </View>
    </ScreenContainer>
  );
}
