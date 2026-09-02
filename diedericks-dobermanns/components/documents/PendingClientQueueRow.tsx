import { useState } from 'react';
import { View } from 'react-native';

import { DocumentPreviewThumb } from '@/components/documents/DocumentPreviewThumb';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import type { PendingClientDocument } from '@/lib/documents/pendingReview';
import { formatDateTime } from '@/lib/format';
import { portalCategoryLabel } from '@/lib/portal/documentLabels';

type Props = {
  item: PendingClientDocument;
  onReview: (
    id: string,
    decision: 'verified' | 'rejected',
    note?: string,
  ) => Promise<{ error?: string }>;
};

export function PendingClientQueueRow({ item, onReview }: Props) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function decide(decision: 'verified' | 'rejected') {
    setBusy(true);
    setError(null);
    const res = await onReview(item.id, decision, note);
    setBusy(false);
    if (res.error) setError(res.error);
  }

  return (
    <View className="rounded-sm border border-gold/20 bg-surface p-4">
      <View className="flex-row gap-3">
        <DocumentPreviewThumb source={item} />
        <View className="flex-1">
          <Typography variant="label" className="text-gold">
            {portalCategoryLabel(item.category)}
          </Typography>
          <Typography variant="body" className="mt-1">
            {item.document_name}
          </Typography>
          <Typography variant="caption" className="mt-1 text-subtle">
            {item.clientName ?? 'Client'}
            {item.dogName ? ` · ${item.dogName}` : ''}
            {item.uploaded_at ? ` · ${formatDateTime(item.uploaded_at)}` : ''}
          </Typography>
        </View>
      </View>

      <Input
        label="If you need a clearer copy"
        value={note}
        onChangeText={setNote}
        placeholder="Say what is missing."
        containerClassName="mt-3 mb-0"
      />
      {error ? (
        <Typography variant="caption" className="mt-2 text-danger">
          {error}
        </Typography>
      ) : null}

      <View className="mt-3 flex-row gap-3">
        <Button
          label="Confirm"
          size="sm"
          disabled={busy}
          loading={busy}
          onPress={() => void decide('verified')}
        />
        <Button
          label="Ask for a clearer copy"
          size="sm"
          variant="outline"
          disabled={busy}
          onPress={() => void decide('rejected')}
        />
      </View>
    </View>
  );
}
