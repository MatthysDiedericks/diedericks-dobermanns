import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { EmptyTabState } from '@/components/dogs/detail/EmptyTabState';
import {
  TemperamentEvaluationSheet,
  type TemperamentEvaluationSheetHandle,
} from '@/components/dogs/detail/TemperamentEvaluationSheet';
import { TemperamentDimensionRow } from '@/components/dogs/detail/TemperamentDimensionRow';
import { SectionCard } from '@/components/dogs/detail/SectionCard';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useDogTemperament } from '@/hooks/useDogTemperament';
import { getTemperamentGrade } from '@/lib/dogs/breedStandards';
import { TEMPERAMENT_DIMENSION_KEYS } from '@/lib/dogs/temperamentDimensions';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { showSaved } from '@/lib/dogDetail/feedback';
import type { Dog } from '@/types/app.types';

interface DogTemperamentTabProps {
  dog: Dog;
  canEdit: boolean;
}

export function DogTemperamentTab({ dog, canEdit }: DogTemperamentTabProps) {
  const sheetRef = useRef<TemperamentEvaluationSheetHandle>(null);
  const { scores, loading, saveScore, refresh } = useDogTemperament(dog.id);
  const [showHistory, setShowHistory] = useState(false);

  const latest = scores[0];
  const grade = latest?.total_score != null ? getTemperamentGrade(latest.total_score) : null;
  const history = scores.slice(1, 6);

  async function handleSave(payload: Parameters<typeof saveScore>[0]) {
    await saveScore(payload);
    showSaved('Evaluation saved ✓');
    await refresh();
  }

  if (loading) {
    return <Typography variant="caption">Loading temperament data…</Typography>;
  }

  return (
    <View className="pb-8">
      <SectionCard title="Temperament evaluation">
        {latest ? (
          <>
            <Typography variant="caption" className="text-subtle">
              Last assessed: {formatKennelDate(latest.assessed_at)} ·{' '}
              {latest.evaluation_standard === 'fci_ztp' ? 'ZTP / FCI-KUSA' : 'AKC/DPCA'}
            </Typography>
            <Typography variant="subtitle" className="my-2" style={{ color: grade?.color }}>
              {latest.total_score ?? '—'} / 80 · {grade?.label.toUpperCase()}
            </Typography>
            <View className="mb-2 h-3 overflow-hidden rounded-full bg-surface">
              <View
                className="h-full rounded-full bg-gold"
                style={{ width: `${((latest.total_score ?? 0) / 80) * 100}%` }}
              />
            </View>
          </>
        ) : (
          <EmptyTabState message="No temperament evaluation recorded yet." />
        )}
        {canEdit ? (
          <Button label="+ New Evaluation" variant="outline" onPress={() => sheetRef.current?.open()} fullWidth className="mt-3" />
        ) : null}
      </SectionCard>

      {latest ? (
        <SectionCard title="Dimension scores">
          {TEMPERAMENT_DIMENSION_KEYS.map((key) => (
            <TemperamentDimensionRow
              key={key}
              dimensionKey={key}
              score={latest[key as keyof typeof latest] as number | null}
              standard={latest.evaluation_standard}
            />
          ))}
        </SectionCard>
      ) : null}

      {history.length > 0 ? (
        <SectionCard title="Previous evaluations">
          <Pressable onPress={() => setShowHistory((v) => !v)}>
            <Typography variant="caption" className="mb-2 text-gold">
              {showHistory ? 'Hide' : 'Show'} previous ({history.length})
            </Typography>
          </Pressable>
          {showHistory
            ? history.map((row) => {
                const g = getTemperamentGrade(row.total_score ?? 0);
                return (
                  <View key={row.id} className="mb-2 border-b border-gold/10 py-2">
                    <Typography variant="body">
                      {formatKennelDate(row.assessed_at)} · {row.total_score ?? '—'}/80
                    </Typography>
                    <Typography variant="caption" style={{ color: g.color }}>
                      {g.label}
                    </Typography>
                  </View>
                );
              })
            : null}
        </SectionCard>
      ) : null}

      {canEdit ? <TemperamentEvaluationSheet ref={sheetRef} dogId={dog.id} onSave={handleSave} /> : null}
    </View>
  );
}
