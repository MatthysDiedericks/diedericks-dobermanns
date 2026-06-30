import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { exportGeneticReportPdf } from '@/components/genetics/GeneticPDFExport';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useGeneticsCalculator } from '@/hooks/useGenetics';

const B_OPTS = ['BB', 'Bb', 'bb'];
const D_OPTS = ['DD', 'Dd', 'dd'];
const VWD_OPTS: Array<'clear' | 'carrier' | 'affected'> = ['clear', 'carrier', 'affected'];

function LocusPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <View className="mb-3">
      <Typography variant="caption" className="text-gold mb-1">{label}</Typography>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            className={`rounded-full px-3 py-1 border ${value === o ? 'border-gold bg-gold/20' : 'border-gold/30'}`}
          >
            <Typography variant="caption">{o}</Typography>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function GeneticsScreen() {
  const calc = useGeneticsCalculator();
  const [showResults, setShowResults] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function onExport() {
    setExporting(true);
    try {
      await exportGeneticReportPdf({
        parentA: 'Manual A',
        parentB: 'Manual B',
        b1: calc.b1,
        b2: calc.b2,
        d1: calc.d1,
        d2: calc.d2,
        colours: calc.colours,
        vwd: calc.vwd,
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Breeding" title="Genetic Forecast" back />
      <ScrollView className="px-6 pb-12">
        <Card>
          <Typography variant="label" className="text-gold mb-3">PARENT A</Typography>
          <LocusPicker label="B locus" value={calc.b1} options={B_OPTS} onChange={calc.setB1} />
          <LocusPicker label="D locus" value={calc.d1} options={D_OPTS} onChange={calc.setD1} />
          <LocusPicker
            label="vWD"
            value={calc.vwd1}
            options={VWD_OPTS}
            onChange={(v) => calc.setVwd1(v as typeof calc.vwd1)}
          />
        </Card>

        <Card className="mt-4">
          <Typography variant="label" className="text-gold mb-3">PARENT B</Typography>
          <LocusPicker label="B locus" value={calc.b2} options={B_OPTS} onChange={calc.setB2} />
          <LocusPicker label="D locus" value={calc.d2} options={D_OPTS} onChange={calc.setD2} />
          <LocusPicker
            label="vWD"
            value={calc.vwd2}
            options={VWD_OPTS}
            onChange={(v) => calc.setVwd2(v as typeof calc.vwd2)}
          />
        </Card>

        <Button
          label="Calculate Offspring Probabilities"
          onPress={() => setShowResults(true)}
          className="mt-4"
          fullWidth
        />

        {showResults ? (
          <Card className="mt-4">
            <Typography variant="label" className="text-gold mb-3">COLOUR OUTCOMES</Typography>
            {calc.colours.map((c) => (
              <View key={c.name} className="mb-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: c.hex }} />
                    <Typography variant="body">{c.name}</Typography>
                  </View>
                  <Typography variant="label">{(c.probability * 100).toFixed(1)}%</Typography>
                </View>
                <View className="mt-1 h-2 rounded-full bg-gold/10">
                  <View className="h-2 rounded-full bg-gold" style={{ width: `${c.probability * 100}%` }} />
                </View>
              </View>
            ))}
            <Typography variant="label" className="text-gold mt-4 mb-2">vWD</Typography>
            <Typography variant="body">
              Clear {(calc.vwd.clear * 100).toFixed(1)}% · Carrier {(calc.vwd.carrier * 100).toFixed(1)}% · Affected {(calc.vwd.affected * 100).toFixed(1)}%
            </Typography>
            {calc.vwd.affected > 0 ? (
              <Typography variant="caption" className="text-danger mt-2">Affected offspring possible — review breeding plan.</Typography>
            ) : null}
            <Typography variant="caption" className="mt-4 text-subtle">
              Statistical estimates only. DNA testing recommended for confirmed genotypes.
            </Typography>
          </Card>
        ) : null}

        {showResults ? (
          <Button label="Generate PDF Report" onPress={onExport} loading={exporting} className="mt-4" fullWidth />
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}
