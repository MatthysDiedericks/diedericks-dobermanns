import { useRef } from 'react';
import { View } from 'react-native';

import {
  MeasurementEditSheet,
  type MeasurementEditSheetHandle,
} from '@/components/dogs/detail/MeasurementEditSheet';
import { SectionCard } from '@/components/dogs/detail/SectionCard';
import { Typography } from '@/components/ui/Typography';
import {
  BREED_STANDARDS,
  evalBodyRatio,
  evalChestDepth,
  evalHeight,
  statusColor,
  type BreedStandard,
} from '@/lib/dogs/breedStandards';
import type { Dog } from '@/types/app.types';

function MeasureRow({
  title,
  standardHint,
  recorded,
  statusLabel,
  status,
  extra,
}: {
  title: string;
  standardHint: string;
  recorded: string;
  statusLabel?: string;
  status?: string;
  extra?: string;
}) {
  return (
    <View className="mb-4 border-b border-gold/10 pb-3">
      <Typography variant="caption" className="text-gold">
        {title}
      </Typography>
      <Typography variant="caption" className="text-subtle">
        Standard: {standardHint}
      </Typography>
      <Typography variant="body" className="mt-1">
        Recorded: {recorded}
      </Typography>
      {extra ? (
        <Typography variant="caption" className="text-subtle">
          {extra}
        </Typography>
      ) : null}
      {statusLabel && status ? (
        <Typography variant="caption" style={{ color: statusColor(status as never) }}>
          {statusLabel}
        </Typography>
      ) : null}
    </View>
  );
}

interface DogMeasurementsPanelProps {
  dog: Dog;
  canEdit: boolean;
  onSaved: () => void;
}

export function DogMeasurementsPanel({ dog, canEdit, onSaved }: DogMeasurementsPanelProps) {
  const sheetRef = useRef<MeasurementEditSheetHandle>(null);
  const standard = (dog.standard ?? 'fci_kusa') as BreedStandard;
  const sex = dog.sex === 'male' ? 'male' : 'female';
  const spec = BREED_STANDARDS[standard];
  const heightRange = sex === 'male' ? spec.heightMale : spec.heightFemale;
  const ratioMax = sex === 'male' ? spec.bodyRatioMaleMax : spec.bodyRatioFemaleMax;

  const height = dog.height_cm != null ? Number(dog.height_cm) : null;
  const bodyLength = dog.body_length_cm != null ? Number(dog.body_length_cm) : null;
  const chestDepth = dog.chest_depth_cm != null ? Number(dog.chest_depth_cm) : null;
  const chestGirth = dog.chest_girth_cm != null ? Number(dog.chest_girth_cm) : null;

  const heightEval = height != null ? evalHeight(height, standard, sex) : null;
  const bodyEval =
    height != null && bodyLength != null ? evalBodyRatio(bodyLength, height, standard, sex) : null;
  const chestEval =
    height != null && chestDepth != null ? evalChestDepth(chestDepth, height, standard) : null;

  return (
    <>
      <SectionCard
        title="Physical measurements"
        action={canEdit ? { label: 'Edit', onPress: () => sheetRef.current?.open() } : undefined}
      >
        <Typography variant="caption" className="mb-3 text-subtle">
          {spec.label}
        </Typography>
        <MeasureRow
          title="WITHERS HEIGHT"
          standardHint={`${heightRange.min}–${heightRange.max} cm${heightRange.ideal ? ` (ideal ${heightRange.ideal})` : ''}`}
          recorded={height != null ? `${height} cm` : 'Not recorded'}
          statusLabel={heightEval?.label}
          status={heightEval?.status}
        />
        <MeasureRow
          title="BODY LENGTH"
          standardHint={`≤ ${ratioMax}% of height`}
          recorded={bodyLength != null ? `${bodyLength} cm` : 'Not recorded'}
          extra={bodyEval ? `Ratio: ${bodyEval.ratio.toFixed(1)}%` : undefined}
          statusLabel={bodyEval?.label}
          status={bodyEval?.status}
        />
        <MeasureRow
          title="CHEST DEPTH"
          standardHint={`~${spec.chestDepthPctIdeal}% of height`}
          recorded={chestDepth != null ? `${chestDepth} cm` : 'Not recorded'}
          extra={chestEval ? `${chestEval.pct.toFixed(1)}% of height` : undefined}
          statusLabel={chestEval?.label}
          status={chestEval?.status}
        />
        <MeasureRow
          title="CHEST GIRTH"
          standardHint="Circumference at deepest point"
          recorded={chestGirth != null ? `${chestGirth} cm` : 'Not recorded'}
        />
      </SectionCard>
      {canEdit ? (
        <MeasurementEditSheet
          ref={sheetRef}
          dogId={dog.id}
          standard={standard}
          initial={{
            height_cm: height,
            body_length_cm: bodyLength,
            chest_depth_cm: chestDepth,
            chest_girth_cm: chestGirth,
          }}
          onSaved={onSaved}
        />
      ) : null}
    </>
  );
}
