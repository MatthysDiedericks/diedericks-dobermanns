import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { DetailRow } from '@/components/dogs/detail/DetailRow';
import { SectionCard } from '@/components/dogs/detail/SectionCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { requireSupabase } from '@/lib/supabase';
import type { BreedingLine, BreedingRole } from '@/types/breeding';

const LINE_OPTIONS: { value: BreedingLine; label: string }[] = [
  { value: 'A', label: 'LINE A' },
  { value: 'B', label: 'LINE B' },
  { value: 'Cross', label: 'LINE CROSS' },
  { value: 'Unknown', label: 'UNKNOWN' },
];

const ROLE_OPTIONS: BreedingRole[] = ['Sire', 'Dam', 'Both', 'Prospect', 'Retired'];

interface ProgrammeState {
  line: BreedingLine | null;
  breeding_role: BreedingRole | null;
  generation: number | null;
  urgency_flag: boolean;
}

function lineDisplay(line: BreedingLine | null): string {
  if (!line || line === 'Unknown') return '—';
  return line === 'Cross' ? 'LINE CROSS' : `LINE ${line}`;
}

function isAssigned(p: ProgrammeState): boolean {
  return Boolean(p.line && p.line !== 'Unknown') || Boolean(p.breeding_role);
}

export function BreedingProgrammeSection({ dogId }: { dogId: string }) {
  const [programme, setProgramme] = useState<ProgrammeState>({
    line: null,
    breeding_role: null,
    generation: null,
    urgency_flag: false,
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProgrammeState>(programme);
  const [generationText, setGenerationText] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProgramme = useCallback(async () => {
    try {
      const { data, error } = await requireSupabase()
        .from('dogs')
        .select('line, breeding_role, generation, urgency_flag')
        .eq('id', dogId)
        .single();
      if (error) throw new Error(error.message);
      const next: ProgrammeState = {
        line: (data.line as BreedingLine | null) ?? null,
        breeding_role: (data.breeding_role as BreedingRole | null) ?? null,
        generation: data.generation,
        urgency_flag: Boolean(data.urgency_flag),
      };
      setProgramme(next);
      if (!editing) {
        setDraft(next);
        setGenerationText(next.generation != null ? String(next.generation) : '');
      }
    } catch {
      /* keep prior state */
    }
  }, [dogId, editing]);

  useEffect(() => {
    void loadProgramme();
  }, [loadProgramme]);

  function startEdit() {
    setDraft(programme);
    setGenerationText(programme.generation != null ? String(programme.generation) : '');
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(programme);
    setGenerationText(programme.generation != null ? String(programme.generation) : '');
    setEditing(false);
  }

  async function save() {
    const generation = generationText.trim() ? parseInt(generationText, 10) : null;
    setSaving(true);
    try {
      const { error } = await requireSupabase()
        .from('dogs')
        .update({
          line: draft.line,
          breeding_role: draft.breeding_role,
          generation: Number.isFinite(generation) ? generation : null,
          urgency_flag: draft.urgency_flag,
        })
        .eq('id', dogId);
      if (error) throw new Error(error.message);
      const saved = {
        ...draft,
        generation: Number.isFinite(generation) ? generation : null,
      };
      setProgramme(saved);
      setEditing(false);
      showSaved('Breeding programme updated ✓');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not save breeding programme.');
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <SectionCard title="Breeding programme">
        <Typography variant="caption" className="mb-2 text-silver">
          BREEDING LINE
        </Typography>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {LINE_OPTIONS.map((opt) => {
            const active = draft.line === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setDraft((d) => ({ ...d, line: opt.value }))}
                className={`rounded-xl border px-3 py-2 ${active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'}`}
              >
                <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>
                  {opt.label}
                </Typography>
              </Pressable>
            );
          })}
        </View>

        <Typography variant="caption" className="mb-2 text-silver">
          BREEDING ROLE
        </Typography>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {ROLE_OPTIONS.map((role) => {
            const active = draft.breeding_role === role;
            return (
              <Pressable
                key={role}
                onPress={() => setDraft((d) => ({ ...d, breeding_role: role }))}
                className={`rounded-xl border px-3 py-2 ${active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'}`}
              >
                <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>
                  {role}
                </Typography>
              </Pressable>
            );
          })}
        </View>

        <Input
          label="Generation"
          value={generationText}
          onChangeText={setGenerationText}
          keyboardType="number-pad"
          placeholder="2"
        />

        <Pressable
          onPress={() => setDraft((d) => ({ ...d, urgency_flag: !d.urgency_flag }))}
          className="mb-4 flex-row items-center justify-between rounded-xl border border-gold/20 bg-surface px-4 py-3"
        >
          <Typography variant="body">Mark as urgent breeding priority</Typography>
          <View className={`h-6 w-11 rounded-full p-0.5 ${draft.urgency_flag ? 'bg-gold' : 'bg-black-rich'}`}>
            <View className={`h-5 w-5 rounded-full bg-ink ${draft.urgency_flag ? 'ml-auto' : ''}`} />
          </View>
        </Pressable>

        <View className="flex-row gap-2">
          <Button label="Save" onPress={() => void save()} loading={saving} className="flex-1" />
          <Button label="Cancel" variant="outline" onPress={cancelEdit} className="flex-1" />
        </View>
      </SectionCard>
    );
  }

  if (!isAssigned(programme)) {
    return (
      <SectionCard title="Breeding programme">
        <Typography variant="body" className="mb-3 text-muted">
          This dog has not been assigned to a breeding line.
        </Typography>
        <Button label="Assign to Breeding Programme" variant="outline" onPress={startEdit} fullWidth />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Breeding programme"
      action={{ label: 'Edit', onPress: startEdit }}
    >
      <DetailRow label="Breeding line" value={lineDisplay(programme.line)} />
      <DetailRow label="Role" value={programme.breeding_role ?? '—'} />
      <DetailRow
        label="Generation"
        value={programme.generation != null ? `Gen ${programme.generation}` : '—'}
      />
      {programme.urgency_flag ? (
        <DetailRow label="Urgency flag" value="⚠ Urgent" />
      ) : null}
    </SectionCard>
  );
}
