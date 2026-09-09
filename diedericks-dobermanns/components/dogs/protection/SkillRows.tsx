import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { SKILL_LEVELS, isScenario } from '@/lib/protection/constants';
import type { DogSkillRow, SkillLevel, SkillLibraryRow } from '@/lib/protection/types';

export function SkillRows({
  library,
  ticked,
  onToggle,
  onLevel,
  onPublic,
  onDelete,
  onReorder,
}: {
  library: SkillLibraryRow[];
  ticked: DogSkillRow[];
  onToggle: (lib: SkillLibraryRow, next: boolean) => void;
  onLevel: (skill: DogSkillRow, level: SkillLevel) => void;
  onPublic: (skill: DogSkillRow, isPublic: boolean) => void;
  onDelete: (skill: DogSkillRow) => void;
  onReorder: (ids: string[]) => void;
}) {
  const byLibrary = new Map(ticked.filter((s) => s.library_id).map((s) => [s.library_id!, s]));
  const ordered = [...ticked].sort(
    (a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label),
  );
  const unticked = library.filter((lib) => !byLibrary.has(lib.id));

  function move(id: string, dir: -1 | 1) {
    const ids = ordered.map((s) => s.id);
    const from = ids.indexOf(id);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= ids.length) return;
    ids.splice(from, 1);
    ids.splice(to, 0, id);
    onReorder(ids);
  }

  return (
    <View className="gap-2">
      {ordered.map((skill) => {
        const lib = skill.library_id
          ? library.find((l) => l.id === skill.library_id)
          : undefined;
        return (
          <View
            key={skill.id}
            className="rounded-sm border border-gold/30 bg-surface px-3 py-3"
          >
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => (lib ? onToggle(lib, false) : onDelete(skill))}
                className="flex-1"
              >
                <Typography>
                  ☑ {skill.label}
                </Typography>
              </Pressable>
              <View className="flex-row gap-3">
                <Pressable onPress={() => move(skill.id, -1)}>
                  <Typography variant="caption">↑</Typography>
                </Pressable>
                <Pressable onPress={() => move(skill.id, 1)}>
                  <Typography variant="caption">↓</Typography>
                </Pressable>
              </View>
            </View>
            <View className="mt-2 flex-row flex-wrap gap-3">
              {skill && !isScenario(skill.discipline) ? (
                <Pressable
                  onPress={() => {
                    const idx = SKILL_LEVELS.indexOf(skill.level ?? 'solid');
                    onLevel(skill, SKILL_LEVELS[(idx + 1) % SKILL_LEVELS.length]!);
                  }}
                >
                  <Typography variant="caption" className="text-gold">
                    {skill.level ?? 'solid'}
                  </Typography>
                </Pressable>
              ) : null}
              <Pressable onPress={() => onPublic(skill, !skill.is_public)}>
                <Typography variant="caption" className="text-gold">
                  {skill.is_public ? 'On listing' : 'Hidden'}
                </Typography>
              </Pressable>
              <Pressable onPress={() => onDelete(skill)}>
                <Typography variant="caption" className="text-red-300">
                  Delete
                </Typography>
              </Pressable>
            </View>
          </View>
        );
      })}
      {unticked.map((lib) => (
        <Pressable
          key={lib.id}
          onPress={() => onToggle(lib, true)}
          className="rounded-sm border border-gold/20 bg-surface px-3 py-3"
        >
          <Typography>☐ {lib.label}</Typography>
        </Pressable>
      ))}
    </View>
  );
}
