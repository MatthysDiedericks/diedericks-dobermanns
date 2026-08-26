import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { printHandoverPack, shareHandoverPack } from '@/lib/handover/sharePack';

export function HandoverPackActions({
  dogId,
  canGenerate,
  released,
}: {
  dogId: string;
  canGenerate: boolean;
  released?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  function run(fn: () => Promise<void>) {
    setBusy(true);
    fn()
      .catch((e) => Alert.alert('Handover pack', e instanceof Error ? e.message : 'Failed'))
      .finally(() => setBusy(false));
  }

  if (!canGenerate && !released) {
    return (
      <Typography variant="caption" className="mt-3 text-subtle">
        The handover pack appears here after go-home. Bulk generation is website-only.
      </Typography>
    );
  }

  return (
    <View className="mt-3">
      <Button
        label={busy ? 'Preparing…' : 'Handover pack'}
        variant="secondary"
        disabled={busy}
        onPress={() => run(() => shareHandoverPack(dogId))}
      />
      {canGenerate ? (
        <Button
          label="Print pack"
          variant="ghost"
          className="mt-2"
          disabled={busy}
          onPress={() => run(() => printHandoverPack(dogId))}
        />
      ) : null}
      <Typography variant="caption" className="mt-2 text-subtle">
        Bulk generation of a whole litter is website-only.
      </Typography>
    </View>
  );
}
