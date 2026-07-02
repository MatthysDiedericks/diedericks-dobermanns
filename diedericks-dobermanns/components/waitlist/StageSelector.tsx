import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { moveWaitlistStage } from '@/lib/waitlist/mutations';
import { PIPELINE_STAGES, stageLabel, TERMINAL_STAGES } from '@/lib/waitlist/constants';
import { useSubmitting } from '@/hooks/useMutations';
import type { WaitingListEntry } from '@/types/app.types';
import { entryDisplayName } from '@/lib/waitlist/helpers';

interface Props {
  visible: boolean;
  entry: WaitingListEntry | null;
  onClose: () => void;
  onSaved: () => void;
}

export function StageSelector({ visible, entry, onClose, onSaved }: Props) {
  const { submitting, run } = useSubmitting();
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const allStages = [...PIPELINE_STAGES, ...TERMINAL_STAGES];

  async function moveTo(stage: string) {
    if (!entry) return;
    if (stage === 'do_not_sell' && !reason.trim()) return;
    const { error } = await run(() =>
      moveWaitlistStage(entry.id, stage, note.trim() || null, stage === 'do_not_sell' ? reason.trim() : undefined),
    );
    if (!error) {
      setNote('');
      setReason('');
      onSaved();
      onClose();
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/60" onPress={onClose}>
        <Pressable className="max-h-[80%] rounded-t-2xl bg-surface p-6" onPress={() => undefined}>
          <Typography variant="subtitle" className="mb-4 text-gold">
            Move {entry ? entryDisplayName(entry) : 'client'}
          </Typography>
          <Input label="Note (optional)" value={note} onChangeText={setNote} multiline className="mb-3 h-16" />
          <ScrollView>
            {allStages.map((stage) => (
              <Pressable
                key={stage}
                disabled={submitting}
                onPress={() => {
                  if (stage === 'do_not_sell' && !reason.trim()) return;
                  void moveTo(stage);
                }}
                className="mb-2 rounded-lg border border-gold/20 px-4 py-3"
              >
                <Typography variant="body">{stageLabel(stage)}</Typography>
              </Pressable>
            ))}
          </ScrollView>
          <Input
            label="Do Not Sell reason (required for that stage)"
            value={reason}
            onChangeText={setReason}
            multiline
            className="mt-3 h-16"
          />
          <Button label="Close" variant="outline" onPress={onClose} fullWidth className="mt-4" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
