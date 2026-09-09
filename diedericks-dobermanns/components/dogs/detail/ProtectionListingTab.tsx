import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { DisciplineList } from '@/components/dogs/protection/DisciplineList';
import { ProtectionFreeText } from '@/components/dogs/protection/ProtectionFreeText';
import { SkillRows } from '@/components/dogs/protection/SkillRows';
import { TemperamentBlock } from '@/components/dogs/protection/TemperamentBlock';
import { SectionCard } from '@/components/dogs/detail/SectionCard';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { showSaved } from '@/lib/dogDetail/feedback';
import {
  collectDisciplines,
  librarySkillsFor,
  parseTemperament,
} from '@/lib/protection/constants';
import {
  copyFromProtectionDog,
  deleteDogSkill,
  reorderDogSkills,
  saveListingFields,
  tickLibrarySkill,
  updateDogSkill,
} from '@/lib/protection/dogWrites';
import { fetchDogSkills, fetchOtherProtectionDogs, fetchSkillLibrary } from '@/lib/protection/queries';
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
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of skills) map[s.discipline] = (map[s.discipline] ?? 0) + 1;
    return map;
  }, [skills]);
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

      <DisciplineList
        disciplines={disciplines}
        counts={counts}
        selected={discipline}
        onSelect={setDiscipline}
      />

      <SkillRows
        library={libRows}
        ticked={ticked}
        onToggle={(lib, next) => {
          if (next) {
            void tickLibrarySkill(dog.id, lib.id)
              .then(() => reload())
              .then(() => showSaved('Saved'))
              .catch((e) => Alert.alert('Could not save', e.message));
          } else {
            const skill = ticked.find((s) => s.library_id === lib.id);
            if (!skill) return;
            void deleteDogSkill(dog.id, skill.id)
              .then(() => setSkills((prev) => prev.filter((s) => s.id !== skill.id)))
              .then(() => showSaved('Saved'))
              .catch((e) => Alert.alert('Could not save', e.message));
          }
        }}
        onLevel={(skill, level: SkillLevel) => {
          void updateDogSkill(dog.id, skill.id, { level })
            .then(() =>
              setSkills((prev) => prev.map((s) => (s.id === skill.id ? { ...s, level } : s))),
            );
        }}
        onPublic={(skill, is_public) => {
          void updateDogSkill(dog.id, skill.id, { is_public })
            .then(() =>
              setSkills((prev) =>
                prev.map((s) => (s.id === skill.id ? { ...s, is_public } : s)),
              ),
            );
        }}
        onDelete={(skill) => {
          void deleteDogSkill(dog.id, skill.id).then(() =>
            setSkills((prev) => prev.filter((s) => s.id !== skill.id)),
          );
        }}
        onReorder={(ids) => {
          setSkills((prev) =>
            prev.map((s) => (ids.includes(s.id) ? { ...s, sort_order: ids.indexOf(s.id) } : s)),
          );
          void reorderDogSkills(dog.id, ids).then(() => showSaved('Saved'));
        }}
      />

      <ProtectionFreeText
        dogId={dog.id}
        discipline={discipline}
        onAdded={() => void reload()}
        onLibrary={(row) => setLibrary((prev) => [...prev, row])}
      />

      <TemperamentBlock
        areas={areas}
        trainingExclusions={trainingExclusions}
        scenarioExclusions={scenarioExclusions}
        onArea={(i, body) => {
          const next = areas.map((a, idx) => (idx === i ? { ...a, body } : a));
          setAreas(next);
          queueFields({ areas: next });
        }}
        onTrainingExclusions={(v) => {
          setTrainingExclusions(v);
          queueFields({ training: v });
        }}
        onScenarioExclusions={(v) => {
          setScenarioExclusions(v);
          queueFields({ scenario: v });
        }}
      />
    </View>
  );
}
