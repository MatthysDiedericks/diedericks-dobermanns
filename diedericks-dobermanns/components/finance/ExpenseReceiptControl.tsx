import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { resolveReceiptViewUrl } from '@/lib/finance/receiptRef';
import { pickAndUploadReceipt } from '@/lib/finance/receiptUpload';

export type ReceiptIntent = 'keep' | 'replace' | 'remove';

export function ExpenseReceiptControl({
  existingPath,
  receiptName,
  intent,
  onIntent,
  onUploaded,
}: {
  existingPath: string | null;
  receiptName: string | null;
  intent: ReceiptIntent;
  onIntent: (intent: ReceiptIntent) => void;
  onUploaded: (path: string, fileName: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    setUploading(true);
    setError(null);
    try {
      const result = await pickAndUploadReceipt();
      if (result) {
        onUploaded(result.path, result.fileName);
        onIntent('replace');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed — original receipt kept.');
    } finally {
      setUploading(false);
    }
  };

  const openExisting = async () => {
    if (!existingPath) return;
    setOpening(true);
    setError(null);
    try {
      const url = await resolveReceiptViewUrl(existingPath);
      if (!url) {
        setError('Could not open receipt.');
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open receipt.');
    } finally {
      setOpening(false);
    }
  };

  if (!existingPath) {
    return (
      <View className="mb-4">
        <Typography variant="label" className="mb-2">
          Receipt
        </Typography>
        <Pressable
          onPress={() => void pick()}
          className="flex-row items-center gap-2 rounded-xl border border-gold/30 bg-surface px-4 py-3"
        >
          {uploading ? (
            <ActivityIndicator size="small" color={Colors.gold} />
          ) : (
            <Ionicons name="document-attach-outline" size={20} color={Colors.gold} />
          )}
          <Typography variant="body">{receiptName ?? 'Pick PDF or image receipt'}</Typography>
        </Pressable>
        {error ? (
          <Typography variant="caption" className="mt-1 text-danger">
            {error}
          </Typography>
        ) : null}
      </View>
    );
  }

  return (
    <View className="mb-4">
      <Typography variant="label" className="mb-2">
        Receipt
      </Typography>
      <View className="mb-2 flex-row flex-wrap gap-2">
        {(['keep', 'replace', 'remove'] as const).map((state) => (
          <Pressable
            key={state}
            onPress={() => onIntent(state)}
            className={`rounded-full border px-3 py-1.5 ${
              intent === state ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption">
              {state === 'keep' ? 'Keep' : state === 'replace' ? 'Replace' : 'Remove'}
            </Typography>
          </Pressable>
        ))}
      </View>
      {intent === 'keep' ? (
        <Pressable onPress={() => void openExisting()} className="flex-row items-center gap-2">
          {opening ? <ActivityIndicator size="small" color={Colors.gold} /> : null}
          <Typography variant="caption" className="text-gold">
            Current receipt →
          </Typography>
        </Pressable>
      ) : null}
      {intent === 'replace' ? (
        <Pressable
          onPress={() => void pick()}
          className="flex-row items-center gap-2 rounded-xl border border-gold/30 bg-surface px-4 py-3"
        >
          {uploading ? (
            <ActivityIndicator size="small" color={Colors.gold} />
          ) : (
            <Ionicons name="document-attach-outline" size={20} color={Colors.gold} />
          )}
          <Typography variant="body">{receiptName ?? 'Pick a replacement'}</Typography>
        </Pressable>
      ) : null}
      {intent === 'remove' ? (
        <Typography variant="caption" className="text-subtle">
          Receipt will be removed when you save.
        </Typography>
      ) : null}
      {error ? (
        <Typography variant="caption" className="mt-1 text-danger">
          {error}
        </Typography>
      ) : null}
    </View>
  );
}
