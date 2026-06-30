import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useLitterReports } from '@/hooks/useLitterReports';
import type { LitterPuppy } from '@/hooks/useLitterWeights';
import {
  buildDogReportHtml,
  buildLitterReportHtml,
  buildPedigreeHtml,
} from '@/lib/reports/litterReportPdf';
import { CollarDot } from '@/lib/litters/collarColours';

async function shareHtml(html: string, name: string) {
  const file = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { dialogTitle: name });
  }
}

export function LitterReportsTab({
  litterId,
  puppies,
}: {
  litterId: string;
  puppies: LitterPuppy[];
}) {
  const { data } = useLitterReports(litterId);
  if (!data) return <Typography variant="bodyMuted">Loading reports…</Typography>;

  return (
    <View className="pb-8">
      <Typography variant="label" className="mb-2 text-gold">
        LITTER REPORTS
      </Typography>
      <View className="mb-6 flex-row gap-2">
        <Button
          label="Litter Report PDF"
          variant="outline"
          onPress={() => void shareHtml(buildLitterReportHtml(data), 'Litter Report')}
        />
      </View>

      <Typography variant="label" className="mb-2 text-gold">
        PUPPY REPORTS
      </Typography>
      <Typography variant="caption" className="mb-3 text-subtle">
        Excludes deceased & stillborn puppies.
      </Typography>
      {data.puppies.map((p, i) => (
        <Card key={p.id} className="mb-2 flex-row items-center">
          <Typography variant="caption" className="mr-2 w-6">
            {i + 1}
          </Typography>
          <CollarDot colour={puppies.find((x) => x.id === p.id)?.collar_colour} />
          <Typography variant="body" className="ml-2 flex-1">
            {p.name}
          </Typography>
          <Pressable onPress={() => void shareHtml(buildPedigreeHtml(p, data), 'Pedigree')}>
            <Typography variant="caption" className="mx-1 text-gold">
              Pedigree
            </Typography>
          </Pressable>
          <Pressable onPress={() => void shareHtml(buildDogReportHtml(p, data), 'Dog Report')}>
            <Typography variant="caption" className="mx-1 text-gold">
              Report
            </Typography>
          </Pressable>
        </Card>
      ))}
    </View>
  );
}
