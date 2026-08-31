import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useBreedingPlan } from '@/hooks/useBreedingPlan';
import {
  addBreedingPlanStep,
  updateBreedingPlanStep,
} from '@/lib/breeding/planMutations';
import {
  fetchDamHeats,
  fetchDamLitters,
  fetchPlanPickerDogs,
  type PlanHeatOption,
  type PlanLitterOption,
  type PlanPickerDog,
} from '@/lib/breeding/planQueries';
import {
  STEP_STATUSES,
  STEP_STATUS_LABELS,
  STEP_TYPE_LABELS,
  STEP_TYPES,
  type StepStatus,
  type StepType,
} from '@/lib/breeding/planTypes';
import { showError, showSaved } from '@/lib/dogDetail/feedback';

function ChipRow<T extends string>({
  options,
  value,
  labels,
  onChange,
}: {
  options: readonly T[];
  value: T;
  labels: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <View className="mb-4 flex-row flex-wrap gap-2">
      {options.map((opt) => (
        <Button
          key={opt}
          label={labels[opt]}
          size="sm"
          variant={value === opt ? 'solid' : 'outline'}
          onPress={() => onChange(opt)}
        />
      ))}
    </View>
  );
}

export default function BreedingPlanStepScreen() {
  const router = useRouter();
  const { id, stepId, after } = useLocalSearchParams<{
    id: string;
    stepId?: string;
    after?: string;
  }>();
  const { plan } = useBreedingPlan(id);
  const existing = useMemo(
    () => plan?.steps.find((s) => s.id === stepId),
    [plan, stepId],
  );

  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [stepType, setStepType] = useState<StepType>('other');
  const [status, setStatus] = useState<StepStatus>('planned');
  const [damId, setDamId] = useState('');
  const [sireId, setSireId] = useState('');
  const [keeperId, setKeeperId] = useState('');
  const [heatId, setHeatId] = useState('');
  const [litterId, setLitterId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [blocked, setBlocked] = useState('');
  const [notes, setNotes] = useState('');
  const [dogs, setDogs] = useState<PlanPickerDog[]>([]);
  const [heats, setHeats] = useState<PlanHeatOption[]>([]);
  const [litters, setLitters] = useState<PlanLitterOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchPlanPickerDogs().then(setDogs).catch(() => setDogs([]));
  }, []);

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setDetail(existing.detail ?? '');
    setStepType(existing.step_type);
    setStatus(existing.status);
    setDamId(existing.dam_id ?? '');
    setSireId(existing.sire_id ?? '');
    setKeeperId(existing.result_dog_id ?? '');
    setHeatId(existing.heat_cycle_id ?? '');
    setLitterId(existing.litter_id ?? '');
    setStart(existing.expected_start ?? '');
    setEnd(existing.expected_end ?? '');
    setBlocked(existing.blocked_reason ?? '');
    setNotes(existing.notes ?? '');
  }, [existing]);

  useEffect(() => {
    if (!damId) {
      setHeats([]);
      setLitters([]);
      return;
    }
    void fetchDamHeats(damId).then(setHeats).catch(() => setHeats([]));
    void fetchDamLitters(damId).then(setLitters).catch(() => setLitters([]));
  }, [damId]);

  const dams = dogs.filter((d) => d.sex === 'female' || d.sex === 'F');
  const sires = dogs.filter((d) => d.sex === 'male' || d.sex === 'M');

  async function save() {
    if (!id) return;
    if (!title.trim()) {
      showError('Write the step as a full sentence.');
      return;
    }
    const payload = {
      title,
      detail,
      step_type: stepType,
      status,
      dam_id: damId || null,
      sire_id: sireId || null,
      result_dog_id: keeperId || null,
      heat_cycle_id: heatId || null,
      litter_id: litterId || null,
      expected_start: start || null,
      expected_end: end || null,
      blocked_reason: blocked,
      notes,
    };
    setSaving(true);
    try {
      if (stepId) await updateBreedingPlanStep(id, stepId, payload);
      else {
        const afterOrder = after ? Number(after) : undefined;
        await addBreedingPlanStep(id, payload, Number.isFinite(afterOrder) ? afterOrder : undefined);
      }
      showSaved();
      router.back();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not save the step');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer>
      <PageHeader title={stepId ? 'Edit step' : 'Add a step'} eyebrow="Plan tracker" />
      <View className="px-6 pb-12">
        <Input
          label="What happens"
          value={title}
          onChangeText={setTitle}
          placeholder="A full sentence anyone can read aloud."
          multiline
        />
        <Input
          label="Why, and what success looks like"
          value={detail}
          onChangeText={setDetail}
          multiline
        />
        <Typography variant="caption" className="mb-2 text-silver">
          Kind of step
        </Typography>
        <ChipRow options={STEP_TYPES} value={stepType} labels={STEP_TYPE_LABELS} onChange={setStepType} />
        <Typography variant="caption" className="mb-2 text-silver">
          Status
        </Typography>
        <ChipRow
          options={STEP_STATUSES}
          value={status}
          labels={STEP_STATUS_LABELS}
          onChange={setStatus}
        />
        <Typography variant="caption" className="mb-2 text-silver">
          Dam
        </Typography>
        <ChipRow
          options={['', ...dams.map((d) => d.id)] as string[]}
          value={damId}
          labels={{ '': 'None', ...Object.fromEntries(dams.map((d) => [d.id, d.name])) }}
          onChange={setDamId}
        />
        <Typography variant="caption" className="mb-2 text-silver">
          Sire
        </Typography>
        <ChipRow
          options={['', ...sires.map((d) => d.id)] as string[]}
          value={sireId}
          labels={{ '': 'None', ...Object.fromEntries(sires.map((d) => [d.id, d.name])) }}
          onChange={setSireId}
        />
        <Typography variant="caption" className="mb-2 text-silver">
          Keeper (once chosen)
        </Typography>
        <ChipRow
          options={['', ...dogs.map((d) => d.id)] as string[]}
          value={keeperId}
          labels={{ '': 'None', ...Object.fromEntries(dogs.map((d) => [d.id, d.name])) }}
          onChange={setKeeperId}
        />
        {heats.length > 0 ? (
          <>
            <Typography variant="caption" className="mb-2 text-silver">
              Linked heat
            </Typography>
            <ChipRow
              options={['', ...heats.map((h) => h.id)] as string[]}
              value={heatId}
              labels={{
                '': 'None',
                ...Object.fromEntries(
                  heats.map((h) => [h.id, `Heat from ${h.heat_start_date}`]),
                ),
              }}
              onChange={setHeatId}
            />
          </>
        ) : null}
        {litters.length > 0 ? (
          <>
            <Typography variant="caption" className="mb-2 text-silver">
              Linked litter
            </Typography>
            <ChipRow
              options={['', ...litters.map((l) => l.id)] as string[]}
              value={litterId}
              labels={{
                '': 'None',
                ...Object.fromEntries(
                  litters.map((l) => [l.id, l.actual_date ?? 'Not yet whelped']),
                ),
              }}
              onChange={setLitterId}
            />
          </>
        ) : null}
        <Input label="Expected start (YYYY-MM-DD)" value={start} onChangeText={setStart} />
        <Input label="Expected end (YYYY-MM-DD)" value={end} onChangeText={setEnd} />
        <Input label="If blocked, why" value={blocked} onChangeText={setBlocked} />
        <Input
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Prefix OVERRIDE: to keep the status you set above."
          multiline
        />
        <Button label="Save step" loading={saving} onPress={() => void save()} />
      </View>
    </ScreenContainer>
  );
}
