import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { SectionCard } from '@/components/dogs/detail/SectionCard';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { showSaved } from '@/lib/dogDetail/feedback';
import {
  SKILL_LEVELS,
  collectDisciplines,
  disciplineLabel,
  isScenario,
  librarySkillsFor,
  parseTemperament,
} from '@/lib/protection/constants';
import {
  addCustomSkill,
  addSkillToLibrary,
  copyFromProtectionDog,
  deleteDogSkill,
  fetchDogSkills,
  fetchOtherProtectionDogs,
  fetchSkillLibrary,
  saveListingFields,
  tickLibrarySkill,
  updateDogSkill,
} from '@/lib/protection/queries';
import type {
  DogSkillRow,
  ProtectionDogOption,
  SkillLevel,
  SkillLibraryRow,
  TemperamentArea,
} from '@/lib/protection/types';
import type { Dog } from '@/types/app.types';

export function ProtectionListingTab({ dog, onRefresh }: { dog: Dog; onRefresh: () => void }) {
  const [library, setLibrary] = useState<SkillLibraryRow[]>([]);
  const [skills, setSkills] = useState<DogSkillRow[]>([]);
  const [others, setOthers] = useState<ProtectionDogOption[]>([]);
  const [discipline, setDiscipline] = useState('obedience');
  const [areas, setAreas] = useState<TemperamentArea[]>(() => parseTemperament(dog.temperament));
  const [trainingExclusions, setTrainingExclusions] = useState(dog.training_exclusions ?? '');
  const [scenarioExclusions, setScenarioExclusions] = useState(dog.scenario_exclusions ?? '');
  const [customLabel, setCustomLabel] = useState('');
  const [offerId, setOfferId] = useState<string | null>(null);
  const [copyId, setCopyId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    const [lib, sk, dogs] = await Promise.all([
      fetchSkillLibrary({ includeInactive: true }),
      fetchDogSkills(dog.id),
      fetchOtherProtectionDogs(dog.id),
    ]);
    setLibrary(lib);
    setSkills(sk);
    setOthers(dogs);
  }, [dog.id]);

  useEffect(() => {
    void reload().catch((e) => Alert.alert('Could not load listing', e.message));
  }, [reload]);

  const disciplines = useMemo(() => collectDisciplines(library, skills), [library, skills]);
  const libRows = useMemo(() => librarySkillsFor(library, discipline), [library, discipline]);
  const ticked = useMemo(
    () => skills.filter((s) => s.discipline === discipline),
    [skills, discipline],
  );

  function queueFields(next: {
    areas?: TemperamentArea[];
    training?: string;
    scenario?: string;
  }) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void saveListingFields(dog.id, {
        temperament: next.areas ?? areas,
        training_exclusions: next.training ?? trainingExclusions,
        scenario_exclusions: next.scenario ?? scenarioExclusions,
      })
        .then(() => showSaved('Saved'))
        .catch((e) => Alert.alert('Could not save', e.message));
    }, 600);
  }

  return (
    <View className="gap-4 pb-10">
      <Typography variant="caption">Autosaves as you work</Typography>
      {others.length > 0 ? (
        <SectionCard title="Copy from another dog">
          {others.map((d) => (
            <Pressable key={d.id} onPress={() => setCopyId(d.id)} className="py-2">
              <Typography className={copyId === d.id ? 'text-gold' : ''}>{d.name}</Typography>
            </Pressable>
          ))}
          <Button
            label="Copy skills and temperament"
            variant="outline"
            disabled={!copyId}
            onPress={() => {
              if (!copyId) return;
              void copyFromProtectionDog(dog.id, copyId)
                .then(() => reload())
                .then(() => {
                  onRefresh();
                  showSaved('Copied');
                })
                .catch((e) => Alert.alert('Copy failed', e.message));
            }}
          />
        </SectionCard>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        {disciplines.map((d) => {
          const count = skills.filter((s) => s.discipline === d).length;
          return (
            <Pressable
              key={d}
              onPress={() => setDiscipline(d)}
              className={`rounded-full border px-3 py-1.5 ${
                discipline === d ? 'border-gold bg-gold/15' : 'border-gold/25'
              }`}
            >
              <Typography variant="caption">
                {disciplineLabel(d)} ({count})
              </Typography>
            </Pressable>
          );
        })}
      </View>

      {libRows.map((lib) => {
        const skill = ticked.find((s) => s.library_id === lib.id);
        return (
          <Pressable
            key={lib.id}
            onPress={() => {
              if (skill) {
                void deleteDogSkill(dog.id, skill.id)
                  .then(() => setSkills((prev) => prev.filter((s) => s.id !== skill.id)))
                  .then(() => showSaved('Saved'))
                  .catch((e) => Alert.alert('Could not save', e.message));
              } else {
                void tickLibrarySkill(dog.id, lib.id)
                  .then(() => reload())
                  .then(() => showSaved('Saved'))
                  .catch((e) => Alert.alert('Could not save', e.message));
              }
            }}
            className="flex-row items-center justify-between rounded-sm border border-gold/20 bg-surface px-3 py-3"
          >
            <Typography>{skill ? '☑' : '☐'} {lib.label}</Typography>
            {skill && !isScenario(lib.discipline) ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  const idx = SKILL_LEVELS.indexOf(skill.level ?? 'solid');
                  const next = SKILL_LEVELS[(idx + 1) % SKILL_LEVELS.length] as SkillLevel;
                  void updateDogSkill(dog.id, skill.id, { level: next })
                    .then(() =>
                      setSkills((prev) =>
                        prev.map((s) => (s.id === skill.id ? { ...s, level: next } : s)),
                      ),
                    );
                }}
              >
                <Typography variant="caption" className="text-gold">
                  {skill.level ?? 'solid'}
                </Typography>
              </Pressable>
            ) : null}
          </Pressable>
        );
      })}

      {ticked
        .filter((s) => !s.library_id)
        .map((skill) => (
          <View key={skill.id} className="rounded-sm border border-gold/30 bg-surface px-3 py-3">
            <Typography>{skill.label}</Typography>
            <Pressable
              onPress={() =>
                void deleteDogSkill(dog.id, skill.id).then(() =>
                  setSkills((prev) => prev.filter((s) => s.id !== skill.id)),
                )
              }
            >
              <Typography variant="caption" className="mt-2 text-red-300">
                Delete
              </Typography>
            </Pressable>
          </View>
        ))}

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
          void addCustomSkill({ dogId: dog.id, discipline, label: customLabel })
            .then((id) => {
              setOfferId(id);
              setCustomLabel('');
              return reload();
            })
            .then(() => showSaved('Saved'))
            .catch((e) => Alert.alert('Could not add', e.message));
        }}
      />
      {offerId ? (
        <Pressable
          onPress={() =>
            void addSkillToLibrary(dog.id, offerId)
              .then(() => {
                setOfferId(null);
                return reload();
              })
              .then(() => showSaved('Added to library'))
          }
        >
          <Typography className="text-gold">Add to library?</Typography>
        </Pressable>
      ) : null}

      <SectionCard title="Temperament">
        {areas.map((area, i) => (
          <View key={area.area} className="mb-3">
            <Typography variant="caption">{area.area}</Typography>
            <TextInput
              multiline
              className="mt-1 min-h-[72px] rounded-sm border border-gold/25 px-3 py-2 text-text"
              value={area.body}
              onChangeText={(body) => {
                const next = areas.map((a, idx) => (idx === i ? { ...a, body } : a));
                setAreas(next);
                queueFields({ areas: next });
              }}
            />
          </View>
        ))}
        <Typography variant="caption">What the sale does not include</Typography>
        <TextInput
          multiline
          className="mt-1 min-h-[64px] rounded-sm border border-gold/25 px-3 py-2 text-text"
          value={trainingExclusions}
          onChangeText={(v) => {
            setTrainingExclusions(v);
            queueFields({ training: v });
          }}
        />
        <Typography variant="caption" className="mt-3">
          What he has not been worked in
        </Typography>
        <TextInput
          multiline
          className="mt-1 min-h-[64px] rounded-sm border border-gold/25 px-3 py-2 text-text"
          value={scenarioExclusions}
          onChangeText={(v) => {
            setScenarioExclusions(v);
            queueFields({ scenario: v });
          }}
        />
      </SectionCard>
    </View>
  );
}
