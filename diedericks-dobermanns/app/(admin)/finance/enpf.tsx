import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { fetchEnpfSettings, saveEnpfSetting } from '@/lib/finance/employeeQueries';
import type { EnpfSetting } from '@/types/employees';

export default function EnpfSettingsScreen() {
  const [rows, setRows] = useState<
    { year: string; ceiling: string; ratePct: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busyYear, setBusyYear] = useState<string | null>(null);

  useEffect(() => {
    void fetchEnpfSettings().then((settings: EnpfSetting[]) => {
      setRows(
        settings.map((s) => ({
          year: String(s.year),
          ceiling: String(s.wage_ceiling),
          ratePct: String(Number((s.rate * 100).toFixed(4))),
        })),
      );
    });
  }, []);

  const save = async (year: string, ceiling: string, ratePct: string) => {
    setBusyYear(year);
    setError(null);
    setSaved(null);
    try {
      await saveEnpfSetting({
        year: Number(year),
        wage_ceiling: Number(ceiling),
        rate: Number(ratePct) / 100,
      });
      setSaved(year);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusyYear(null);
    }
  };

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Finance" title="ENPF settings" />
      <ScrollView className="px-6 pb-12">
        <Typography variant="caption" className="mb-4 text-subtle">
          Ceiling and rate by year. Payslip suggestions read this table — changing a
          year updates the next payslip with no code change.
        </Typography>
        {rows.map((row, i) => (
          <Card key={row.year} className="mb-3">
            <Input label="Year" value={row.year} editable={false} />
            <Input
              label="Wage ceiling"
              value={row.ceiling}
              keyboardType="decimal-pad"
              onChangeText={(v) =>
                setRows((all) => all.map((r, idx) => (idx === i ? { ...r, ceiling: v } : r)))
              }
            />
            <Input
              label="Rate %"
              value={row.ratePct}
              keyboardType="decimal-pad"
              onChangeText={(v) =>
                setRows((all) => all.map((r, idx) => (idx === i ? { ...r, ratePct: v } : r)))
              }
            />
            <Button
              label={busyYear === row.year ? 'Saving…' : 'Save'}
              onPress={() => void save(row.year, row.ceiling, row.ratePct)}
              loading={busyYear === row.year}
            />
          </Card>
        ))}
        {saved ? (
          <Typography variant="caption" className="text-success">
            Saved {saved}.
          </Typography>
        ) : null}
        {error ? (
          <Typography variant="caption" className="text-danger">
            {error}
          </Typography>
        ) : null}
        <View className="h-8" />
      </ScrollView>
    </ScreenContainer>
  );
}
