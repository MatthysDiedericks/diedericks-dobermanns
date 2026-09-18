import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import {
  archiveLitter,
  deleteLitter,
  getLitterDeleteImpact,
} from '@/hooks/useMutations';
import {
  confirmToken,
  dangerTitle,
  destroyedLines,
  disconnectedLines,
  litterDangerMode,
  namesMatch,
  preservedLines,
  type LitterDeleteImpact,
} from '@/lib/litters/deleteImpact';

export function LitterDeleteConfirm({
  litterId,
  litterName,
  puppyCount,
  visible,
  onClose,
  onDone,
}: {
  litterId: string;
  litterName: string | null;
  puppyCount: number;
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [impact, setImpact] = useState<LitterDeleteImpact | null>(null);
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    setTyped('');
    setLoading(true);
    const res = await getLitterDeleteImpact(litterId);
    setLoading(false);
    if (res.error || !res.impact) {
      setError(res.error ?? 'Could not load what this would affect.');
      return;
    }
    setImpact(res.impact);
  }

  async function run() {
    if (!impact) return;
    const mode = litterDangerMode(impact);
    if (mode === 'delete' && !namesMatch(impact.litterName, typed)) return;
    setLoading(true);
    setError(null);
    const res =
      mode === 'archive'
        ? await archiveLitter(litterId)
        : await deleteLitter(litterId, typed);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onDone();
  }

  const mode = impact
    ? litterDangerMode(impact)
    : puppyCount > 0
      ? 'archive'
      : 'delete';
  const title = dangerTitle(mode, impact?.litterName ?? litterName);
  const token = confirmToken(impact?.litterName ?? litterName);
  const canDelete = mode === 'delete' && namesMatch(impact?.litterName, typed);

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={title}
      onShow={() => void load()}
    >
      <ScrollView style={{ maxHeight: 420 }}>
        {!impact && loading ? (
          <Typography variant="bodyMuted">Counting what this would affect…</Typography>
        ) : null}
        {impact && mode === 'archive' ? (
          <View>
            <Typography variant="bodyMuted">
              This litter produced {impact.puppies}{' '}
              {impact.puppies === 1 ? 'puppy' : 'puppies'}, so it cannot be
              deleted — it is history.
            </Typography>
            <Typography variant="bodyMuted" className="mt-3">
              Archive hides it from the working lists. The puppies, health
              records, photographs and finances stay.
            </Typography>
            {preservedLines(impact).map((line) => (
              <Typography key={line} variant="caption" className="mt-2">
                • {line}
              </Typography>
            ))}
          </View>
        ) : null}
        {impact && mode === 'delete' ? (
          <View>
            {destroyedLines(impact).length ? (
              <View>
                <Typography variant="body">This permanently deletes:</Typography>
                {destroyedLines(impact).map((line) => (
                  <Typography key={line} variant="caption" className="mt-1">
                    • {line}
                  </Typography>
                ))}
              </View>
            ) : (
              <Typography variant="bodyMuted">
                Nothing else is attached to this litter.
              </Typography>
            )}
            {disconnectedLines(impact).length ? (
              <View className="mt-3">
                <Typography variant="body">And disconnects:</Typography>
                {disconnectedLines(impact).map((line) => (
                  <Typography key={line} variant="caption" className="mt-1">
                    • {line}
                  </Typography>
                ))}
              </View>
            ) : null}
            <Typography variant="caption" className="mt-3 text-danger">
              This cannot be undone.
            </Typography>
            <Input
              label={`Type ${token} to confirm`}
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="none"
              autoCorrect={false}
              containerClassName="mt-4 mb-0"
            />
          </View>
        ) : null}
        {error ? (
          <Typography variant="caption" className="mt-3 text-danger">
            {error}
          </Typography>
        ) : null}
      </ScrollView>
      <View className="mt-6 flex-row gap-3">
        <Button
          label="Cancel"
          variant="outline"
          onPress={onClose}
          className="flex-1"
          disabled={loading}
        />
        {mode === 'archive' ? (
          <Button
            label="Archive this litter"
            variant="solid"
            onPress={() => void run()}
            className="flex-1"
            loading={loading}
            disabled={!impact}
          />
        ) : (
          <Button
            label="Permanently delete"
            variant="danger"
            onPress={() => void run()}
            className="flex-1"
            loading={loading}
            disabled={!impact || !canDelete}
          />
        )}
      </View>
    </Modal>
  );
}
