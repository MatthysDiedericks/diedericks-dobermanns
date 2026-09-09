import { View } from 'react-native';
import { useEffect, useState } from 'react';

import { Collapsible } from '@/components/ui/Collapsible';
import { Typography } from '@/components/ui/Typography';
import {
  LEVEL_KEY,
  SHOW_LEVEL_PUBLIC,
  disciplineLabel,
  filledTemperament,
  hasLevel,
  parseTemperament,
} from '@/lib/protection/constants';
import { fetchDogSkills } from '@/lib/protection/queries';
import type { DogSkillRow } from '@/lib/protection/types';
import type { Dog } from '@/types/app.types';

export function PublicProtectionSections({ dog }: { dog: Dog }) {
  const [skills, setSkills] = useState<DogSkillRow[]>([]);

  useEffect(() => {
    void fetchDogSkills(dog.id)
      .then(setSkills)
      .catch(() => setSkills([]));
  }, [dog.id]);

  if (dog.programme_tier !== 'protection_dog') return null;

  const areas = filledTemperament(parseTemperament(dog.temperament));
  const training = skills.filter((s) => s.discipline !== 'scenario');
  const scenarios = skills.filter((s) => s.discipline === 'scenario');
  const commands = skills.filter((s) => hasLevel(s.discipline, s.level));
  const groups = new Map<string, DogSkillRow[]>();
  for (const s of training) {
    const list = groups.get(s.discipline) ?? [];
    list.push(s);
    groups.set(s.discipline, list);
  }

  return (
    <View>
      {dog.description ? (
        <Collapsible title="His Story" defaultOpen>
          <Typography variant="bodyMuted">{dog.description}</Typography>
        </Collapsible>
      ) : null}

      {groups.size > 0 || dog.training_exclusions ? (
        <Collapsible title="What his training covered">
          {[...groups.entries()].map(([d, rows]) => (
            <View key={d} className="mb-3">
              <Typography variant="caption">{disciplineLabel(d)}</Typography>
              {rows.map((r) => (
                <Typography key={r.id} variant="bodyMuted">
                  {r.label}
                </Typography>
              ))}
            </View>
          ))}
          {dog.training_exclusions ? (
            <View className="mt-3 border border-gold/30 p-3">
              <Typography variant="caption">What is not included</Typography>
              <Typography variant="bodyMuted">{dog.training_exclusions}</Typography>
            </View>
          ) : null}
        </Collapsible>
      ) : null}

      {areas.length > 0 ? (
        <Collapsible title="Temperament & Behaviour">
          {areas.map((a) => (
            <View key={a.area} className="mb-3">
              <Typography variant="caption">{a.area}</Typography>
              <Typography variant="bodyMuted">{a.body}</Typography>
            </View>
          ))}
        </Collapsible>
      ) : null}

      {scenarios.length > 0 || dog.scenario_exclusions ? (
        <Collapsible title="Scenarios he has been worked in">
          {scenarios.map((r) => (
            <View key={r.id} className="mb-3">
              <Typography>{r.label}</Typography>
              {r.detail ? <Typography variant="bodyMuted">{r.detail}</Typography> : null}
              {r.conditions.length > 0 ? (
                <Typography variant="caption">{r.conditions.join(' · ')}</Typography>
              ) : null}
            </View>
          ))}
          {dog.scenario_exclusions ? (
            <View className="mt-3 border border-gold/30 p-3">
              <Typography variant="caption">Not yet worked in</Typography>
              <Typography variant="bodyMuted">{dog.scenario_exclusions}</Typography>
            </View>
          ) : null}
        </Collapsible>
      ) : null}

      {commands.length > 0 ? (
        <Collapsible title="Commands he knows">
          {commands.map((r) => (
            <View key={r.id} className="mb-2">
              <Typography>
                {r.label}
                {SHOW_LEVEL_PUBLIC && r.level ? ` · ${r.level}` : ''}
              </Typography>
              {r.detail ? <Typography variant="bodyMuted">{r.detail}</Typography> : null}
            </View>
          ))}
          {SHOW_LEVEL_PUBLIC ? (
            <Typography variant="caption" className="mt-2">
              {LEVEL_KEY}
            </Typography>
          ) : null}
        </Collapsible>
      ) : null}
    </View>
  );
}
