import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { recordBuyerCallName } from '@/lib/dogs/buyerName';
import { isPlaceholderDogName, realDogName } from '@/lib/dogs/placeholderName';
import { showError } from '@/lib/dogDetail/feedback';
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
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [buyerCallName, setBuyerCallName] = useState('');
  const allStages = [...PIPELINE_STAGES, ...TERMINAL_STAGES];

  function reset() {
    setNote('');
    setReason('');
    setDepositOpen(false);
    setDepositAmount('');
    setDepositMethod('');
    setDepositRef('');
    setHandoverOpen(false);
    setBuyerCallName('');
  }

  async function moveTo(stage: string) {
    if (!entry) return;
    const needsReason = stage === 'do_not_sell' || stage === 'on_hold' || stage === 'withdrawn';
    if (needsReason && !reason.trim() && !note.trim()) return;
    const { error } = await run(() =>
      moveWaitlistStage(
        entry.id,
        stage,
        note.trim() || reason.trim() || null,
        stage === 'do_not_sell' ? reason.trim() || note.trim() : undefined,
      ),
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

  async function confirmHandover() {
    if (!entry) return;
    if (entry.assigned_dog_id) {
      if (isPlaceholderDogName(buyerCallName)) return;
      const { error: nameErr } = await run(() =>
        recordBuyerCallName(entry.assigned_dog_id!, buyerCallName, entry.assigned_dog?.name),
      );
      if (nameErr) {
        showError(nameErr);
        return;
      }
    }
    await moveTo('handover_complete');
  }

  function selectStage(stage: string) {
    if (
      (stage === 'do_not_sell' || stage === 'on_hold' || stage === 'withdrawn') &&
      !reason.trim() &&
      !note.trim()
    ) {
      return;
    }
    if (stage === 'quote_sent') {
      goToQuoteBuilder();
      return;
    }
    if (stage === 'deposit_paid') {
      setDepositOpen(true);
      setDepositAmount(entry?.quoted_price ? String(entry.quoted_price) : '');
      return;
    }
    if (stage === 'handover_complete' && entry?.assigned_dog_id) {
      setHandoverOpen(true);
      setBuyerCallName(
        realDogName(entry.assigned_dog?.call_name, entry.assigned_dog?.name) ?? '',
      );
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
          ) : handoverOpen ? (
            <View>
              <Typography variant="label" className="mb-2 text-gold">
                Name the buyer uses
              </Typography>
              {entry?.assigned_dog?.name && isPlaceholderDogName(entry.assigned_dog.name) ? (
                <Typography variant="caption" className="mb-2 text-amber-300">
                  Currently listed as {entry.assigned_dog.name}. Do not leave this as the name
                  they will be wished happy birthday under.
                </Typography>
              ) : null}
              <Input
                label="What do they call this dog?"
                placeholder="Ade"
                autoCapitalize="words"
                value={buyerCallName}
                onChangeText={setBuyerCallName}
              />
              <Typography variant="caption" className="mt-2 text-silver">
                Saved on the dog as the call name. Ask at handover so birthday check-ins are
                personal, not “Puppy 7”.
              </Typography>
              <Button
                label="Complete handover"
                onPress={() => void confirmHandover()}
                loading={submitting}
                disabled={isPlaceholderDogName(buyerCallName)}
                fullWidth
                className="mt-4"
              />
              <Button
                label="Cancel"
                variant="outline"
                onPress={() => setHandoverOpen(false)}
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
                label="Reason (required for On Hold / Do Not Sell / Withdrawn)"
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
