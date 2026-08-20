import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { deleteInvoicePayment } from '@/hooks/useInvoices';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import { ledgerProofLabel } from '@/lib/finance/proofSource';
import type { InvoicePayment } from '@/types/finance';

export function PaymentHistoryList({
  payments,
  onChanged,
}: {
  payments: InvoicePayment[];
  onChanged: () => void;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (payments.length === 0) return null;

  const remove = async (p: InvoicePayment) => {
    if (p.proof_document_id && deleteId !== p.id) {
      setDeleteId(p.id);
      setReason('');
      return;
    }
    if (p.proof_document_id && !reason.trim()) {
      Alert.alert(
        'Proof attached',
        'Type a reason to delete a payment that has a proof attached. The document is kept.',
      );
      return;
    }
    setBusy(true);
    try {
      await deleteInvoicePayment(p.id, { reason: reason.trim() || undefined });
      setDeleteId(null);
      setReason('');
      onChanged();
    } catch (e) {
      Alert.alert('Could not delete', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="mt-6">
      <Typography variant="label" className="mb-2">
        Payment history
      </Typography>
      {payments.map((p) => (
        <Card key={p.id} className="mb-2">
          <View className="flex-row justify-between">
            <Typography variant="body">{formatDate(p.payment_date)}</Typography>
            <Typography variant="label" className="text-success">
              {formatAmount(p.amount)}
            </Typography>
          </View>
          {ledgerProofLabel(p.proof_document_id, p.proof_provided_by) ? (
            <Typography variant="caption" className="mt-1 text-gold">
              {ledgerProofLabel(p.proof_document_id, p.proof_provided_by)}
            </Typography>
          ) : null}
          {deleteId === p.id ? (
            <View className="mt-2">
              <Input
                value={reason}
                onChangeText={setReason}
                placeholder="Why is this payment being removed?"
                className="mb-2"
              />
              <Typography variant="caption" className="mb-2 text-subtle">
                The proof file is kept. This reason is written to the audit log with the old amount.
              </Typography>
            </View>
          ) : null}
          <Pressable disabled={busy} onPress={() => void remove(p)} className="mt-2 self-end">
            <Typography variant="caption" className="text-danger">
              {deleteId === p.id ? 'Confirm delete' : 'Delete'}
            </Typography>
          </Pressable>
        </Card>
      ))}
    </View>
  );
}
