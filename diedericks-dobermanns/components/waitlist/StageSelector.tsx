import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { moveWaitlistStage } from '@/lib/waitlist/mutations';
import { createHandoverBalanceInvoice, recordWaitlistDeposit } from '@/lib/waitlist/salesFlow';
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
  const router = useRouter();
  const { submitting, run } = useSubmitting();
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('');
  const [depositRef, setDepositRef] = useState('');
  const allStages = [...PIPELINE_STAGES, ...TERMINAL_STAGES];

  function reset() {
    setNote('');
    setReason('');
    setDepositOpen(false);
    setDepositAmount('');
    setDepositMethod('');
    setDepositRef('');
  }

  async function moveTo(stage: string) {
    if (!entry) return;
    if (stage === 'do_not_sell' && !reason.trim()) return;
    const { error } = await run(() =>
      moveWaitlistStage(entry.id, stage, note.trim() || null, stage === 'do_not_sell' ? reason.trim() : undefined),
    );
    if (!error) {
      if (stage === 'handover_complete') {
        // Fire-and-forget: a failure here shouldn't block the stage change itself —
        // it's just logged for the admin to reconcile (see salesFlow.ts).
        void createHandoverBalanceInvoice(entry).then((r) => {
          if (r.error) console.error('[StageSelector] balance invoice:', r.error);
        });
      }
      reset();
      onSaved();
      onClose();
    }
  }

  function goToQuoteBuilder() {
    if (!entry) return;
    const params: Record<string, string> = { waitlistId: entry.id };
    if (entry.client_id) {
      params.clientId = entry.client_id;
    } else if (entry.enquirer_name) {
      params.walkinName = entry.enquirer_name;
      const contact = entry.enquirer_phone || entry.enquirer_email;
      if (contact) params.walkinContact = contact;
    }
    if (entry.assigned_dog_id) params.dogId = entry.assigned_dog_id;
    if (entry.assigned_litter_id) params.litterId = entry.assigned_litter_id;
    reset();
    onClose();
    router.push({ pathname: '/(admin)/quotes/new', params });
  }

  async function confirmDeposit() {
    if (!entry) return;
    const amount = Number(depositAmount);
    if (!amount || amount <= 0) return;
    const { error } = await run(() =>
      recordWaitlistDeposit(entry, amount, depositMethod.trim() || null, depositRef.trim() || null),
    );
    if (!error) {
      reset();
      onSaved();
      onClose();
    }
  }

  function selectStage(stage: string) {
    if (stage === 'do_not_sell' && !reason.trim()) return;
    if (stage === 'quote_sent') {
      goToQuoteBuilder();
      return;
    }
    if (stage === 'deposit_paid') {
      setDepositOpen(true);
      setDepositAmount(entry?.quoted_price ? String(entry.quoted_price) : '');
      return;
    }
    void moveTo(stage);
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable className="flex-1 justify-end bg-black/60" onPress={handleClose}>
        <Pressable className="max-h-[85%] rounded-t-2xl bg-surface p-6" onPress={() => undefined}>
          <Typography variant="subtitle" className="mb-4 text-gold">
            Move {entry ? entryDisplayName(entry) : 'client'}
          </Typography>

          {depositOpen ? (
            <View>
              <Typography variant="label" className="mb-2 text-gold">Record Deposit</Typography>
              <Input
                label="Amount (ZAR)"
                keyboardType="numeric"
                value={depositAmount}
                onChangeText={setDepositAmount}
              />
              <Input
                label="Payment method (optional)"
                placeholder="EFT, cash, card…"
                value={depositMethod}
                onChangeText={setDepositMethod}
                className="mt-3"
              />
              <Input
                label="Reference (optional)"
                value={depositRef}
                onChangeText={setDepositRef}
                className="mt-3"
              />
              <Typography variant="caption" className="mt-2 text-silver">
                Creates a paid invoice for this amount and moves the entry to Deposit Paid.
              </Typography>
              <Button
                label="Record Deposit"
                onPress={confirmDeposit}
                loading={submitting}
                disabled={!Number(depositAmount)}
                fullWidth
                className="mt-4"
              />
              <Button
                label="Cancel"
                variant="outline"
                onPress={() => setDepositOpen(false)}
                fullWidth
                className="mt-2"
              />
            </View>
          ) : (
            <>
              <Input label="Note (optional)" value={note} onChangeText={setNote} multiline className="mb-3 h-16" />
              <ScrollView>
                {allStages.map((stage) => (
                  <Pressable
                    key={stage}
                    disabled={submitting}
                    onPress={() => selectStage(stage)}
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
            </>
          )}
          <Button label="Close" variant="outline" onPress={handleClose} fullWidth className="mt-4" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
