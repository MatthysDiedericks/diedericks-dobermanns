import { Image } from 'expo-image';
import { ScrollView, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import type { LineageParent } from '@/hooks/useCommittedBreeding';
import { formatKennelDate } from '@/lib/kennel/formatters';

function names(parent: LineageParent) {
  const call = parent.callName?.trim() || parent.name;
  const registered = parent.registeredName?.trim() || null;
  return { call, registered, showBoth: Boolean(registered && registered !== call) };
}

export function LineageParentCard({ parent }: { parent: LineageParent }) {
  const { call, registered, showBoth } = names(parent);
  const extra = parent.photoUrls.slice(1, 8);

  return (
    <Card className="mb-4">
      <View className="flex-row items-center">
        <View className="h-16 w-16 overflow-hidden rounded-xl bg-surface">
          {parent.photoUrl ? (
            <Image source={{ uri: parent.photoUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : null}
        </View>
        <View className="ml-4 flex-1">
          <Typography variant="label">{parent.role === 'sire' ? 'Sire' : 'Dam'}</Typography>
          <Typography variant="title">{call}</Typography>
          {showBoth ? (
            <Typography variant="caption" className="mt-0.5">
              {registered}
            </Typography>
          ) : null}
        </View>
      </View>

      {extra.length > 0 ? (
        <ScrollView horizontal className="mt-3" showsHorizontalScrollIndicator={false}>
          {extra.map((url) => (
            <View key={url} className="mr-2 h-16 w-16 overflow-hidden rounded-lg bg-surface">
              <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View className="mt-3 flex-row flex-wrap gap-2">
        {parent.hipScore ? <Chip label={`Hips ${parent.hipScore}`} /> : null}
        {parent.elbowScore ? <Chip label={`Elbows ${parent.elbowScore}`} /> : null}
        {parent.dcmStatus ? <Chip label={`DCM ${parent.dcmStatus}`} /> : null}
      </View>

      <Typography variant="label" className="mt-4">
        Health tests
      </Typography>
      {parent.healthTests.length === 0 ? (
        <Typography variant="bodyMuted" className="mt-1">
          No health tests on file yet.
        </Typography>
      ) : (
        parent.healthTests.map((test, i) => (
          <Typography key={`${test.testName}-${i}`} variant="caption" className="mt-1">
            {test.testName}
            {test.result ? ` · ${test.result}` : ''}
            {test.testedDate ? ` · ${formatKennelDate(test.testedDate)}` : ''}
          </Typography>
        ))
      )}

      {!parent.pedigreeRecorded ? (
        <Typography variant="bodyMuted" className="mt-3">
          Pedigree not yet recorded.
        </Typography>
      ) : null}
    </Card>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View className="rounded-full border border-gold/25 px-2.5 py-1">
      <Typography variant="caption">{label}</Typography>
    </View>
  );
}
