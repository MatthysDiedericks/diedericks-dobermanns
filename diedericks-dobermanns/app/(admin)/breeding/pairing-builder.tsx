import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import {
  LineBadge,
  pairingLineSuggestionNote,
  suggestPairingLine,
} from '@/components/breeding/LineBadge';
import { LinedDogPicker } from '@/components/breeding/LinedDogPicker';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import {
  useAllPairings,
  useBreedingDogs,
  useSavePairing,
} from '@/hooks/useBreedingProgramme';
import { COI_DANGER, COI_WARNING } from '@/lib/breeding/constants';
import {
  ageGatePassed,
  checkPairingValidity,
  damAgeMonths,
  estimateCoi,
  healthGatePassed,
  healthGatePending,
} from '@/lib/breeding/rules';
import type { BreedingDog } from '@/types/breeding';

function HealthPanel({ dog, role }: { dog: BreedingDog; role: string }) {
  const passed = healthGatePassed(dog);
  const pending = healthGatePending(dog);
  return (
    <View className="mb-2">
      <View className="flex-row flex-wrap items-center">
        <Typography variant="caption" className="text-gold">
          {role}: {dog.name}
        </Typography>
        <LineBadge line={dog.line} />
      </View>
      <Typography variant="caption" className="text-subtle">
        DCM1–5: {dog.health_dcm1 ?? '—'}/{dog.health_dcm2 ?? '—'}/{dog.health_dcm3 ?? '—'}/
        {dog.health_dcm4 ?? '—'}/{dog.health_dcm5 ?? '—'} · HD: {dog.health_hd ?? '—'} · ED:{' '}
        {dog.health_ed ?? '—'}
      </Typography>
      <Typography
        variant="caption"
        className={passed ? 'text-success' : pending ? 'text-gold' : 'text-danger'}
      >
        {passed ? '✓ Health gate passed' : pending ? '⚠ Pending tests' : '✗ Health gate failed'}
      </Typography>
    </View>
  );
}

export default function PairingBuilderScreen() {
  const router = useRouter();
  const { sires, dams, loading } = useBreedingDogs();
  const { pairings } = useAllPairings();
  const savePairing = useSavePairing();

  const [sireId, setSireId] = useState('');
  const [damId, setDamId] = useState('');
  const [line, setLine] = useState<'A' | 'B' | 'Cross'>('A');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const sire = useMemo(() => sires.find((d) => d.id === sireId), [sires, sireId]);
  const dam = useMemo(() => dams.find((d) => d.id === damId), [dams, damId]);

  useEffect(() => {
    if (sire && dam) {
      setLine(suggestPairingLine(sire.line, dam.line));
    }
  }, [sireId, damId, sire, dam]);

  const validity = useMemo(() => {
    if (!sire || !dam) return null;
    return checkPairingValidity(sire, dam, { pairings });
  }, [sire, dam, pairings]);

  const coi = useMemo(() => {
    if (!sire || !dam) return null;
    return estimateCoi(sire, dam);
  }, [sire, dam]);

  const ageGate = useMemo(() => {
    if (!dam) return null;
    return ageGatePassed(dam, new Date());
  }, [dam]);

  const canSave =
    sire &&
    dam &&
    validity?.allowed &&
    healthGatePassed(sire) &&
    healthGatePassed(dam) &&
    ageGate?.passed;

  async function onSave() {
    if (!sire || !dam || !canSave) return;
    setSaving(true);
    try {
      await savePairing({
        sire_id: sire.id,
        dam_id: dam.id,
        line,
        generation: Math.max(sire.generation ?? 1, dam.generation ?? 1),
        status: 'Planned',
        priority: 'Active',
        coi_estimate: coi,
        notes: notes.trim() || null,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Breeding Programme" title="Pairing Builder" />
      <ScrollView className="px-6 pb-12">
        <Typography variant="caption" className="mb-4 text-subtle">
          We test further than required — DCM1 through DCM5, plus HD and ED on every breeding dog.
        </Typography>

        {loading ? (
          <Typography variant="caption">Loading dogs…</Typography>
        ) : (
          <>
            <LinedDogPicker label="Sire *" dogs={sires} selectedId={sireId} onSelect={setSireId} />
            <LinedDogPicker label="Dam *" dogs={dams} selectedId={damId} onSelect={setDamId} />

            {sire && dam ? (
              <Typography variant="caption" className="mb-2 text-gold">
                {pairingLineSuggestionNote(sire.line, dam.line)}
              </Typography>
            ) : null}

            <Typography variant="caption" className="mb-2 text-muted">
              Line
            </Typography>
            <View className="mb-4 flex-row gap-2">
              {(['A', 'B', 'Cross'] as const).map((l) => (
                <Button
                  key={l}
                  label={`Line ${l}`}
                  size="sm"
                  variant={line === l ? 'primary' : 'outline'}
                  onPress={() => setLine(l)}
                />
              ))}
            </View>

            {validity ? (
              <Card className="mb-4">
                <Typography
                  variant="label"
                  className={validity.allowed ? 'text-success' : 'text-danger'}
                >
                  {validity.allowed ? '✓ Allowed' : `✗ ${validity.reason}`}
                </Typography>
              </Card>
            ) : null}

            {sire && dam ? (
              <Card className="mb-4">
                <HealthPanel dog={sire} role="Sire" />
                <HealthPanel dog={dam} role="Dam" />
                {damAgeMonths(dam) != null ? (
                  <Typography variant="caption" className="text-subtle">
                    Dam age: {damAgeMonths(dam)} months
                    {ageGate?.warning ? ` — ${ageGate.warning}` : ''}
                  </Typography>
                ) : null}
                {coi != null ? (
                  <Typography
                    variant="caption"
                    className={
                      coi > COI_DANGER
                        ? 'text-danger'
                        : coi > COI_WARNING
                          ? 'text-gold'
                          : 'text-subtle'
                    }
                  >
                    Est. COI: {coi}%
                    {coi > COI_DANGER
                      ? ' — RED: above 12.5%'
                      : coi > COI_WARNING
                        ? ' — WARNING: above 6.25%'
                        : ''}
                  </Typography>
                ) : null}
              </Card>
            ) : null}

            <Typography variant="caption" className="mb-1 text-muted">
              Notes
            </Typography>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional programme notes"
              placeholderTextColor={Colors.silver}
              multiline
              className="mb-6 rounded-xl border border-gold/20 bg-[#111008] px-4 py-3 font-body text-ink"
              style={{ minHeight: 72, textAlignVertical: 'top' }}
            />

            <Button
              label="Save pairing"
              onPress={() => void onSave()}
              loading={saving}
              disabled={!canSave}
              fullWidth
            />
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
