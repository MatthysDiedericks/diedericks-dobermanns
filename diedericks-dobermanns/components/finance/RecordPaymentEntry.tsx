import { useState } from 'react';
import { Alert, View } from 'react-native';

import { RecordPaymentForm } from '@/components/finance/RecordPaymentForm';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { NO_INVOICE_FOR_PAYMENT } from '@/lib/finance/proofSource';
import { requireSupabase } from '@/lib/supabase';

export function RecordPaymentEntry({
  invoiceId,
  onSaved,
}: {
  invoiceId: string | null;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [explain, setExplain] = useState(false);
  const [invoice, setInvoice] = useState<{
    id: string;
    clientId: string | null;
    invoiceNumber: string;
    outstanding: number;
    quoteId: string | null;
  } | null>(null);

  const openPanel = async () => {
    if (!invoiceId) {
      setExplain(true);
      return;
    }
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('invoices')
      .select('id, client_id, invoice_number, amount_outstanding, quote_id, status')
      .eq('id', invoiceId)
      .maybeSingle();
    if (error || !data) {
      Alert.alert('Invoice', error?.message ?? 'Invoice not found.');
      return;
    }
    if (data.status === 'void' || data.status === 'cancelled') {
      Alert.alert('Invoice', 'This invoice cannot take a payment.');
      return;
    }
    setInvoice({
      id: data.id,
      clientId: data.client_id,
      invoiceNumber: data.invoice_number,
      outstanding: Number(data.amount_outstanding ?? 0),
      quoteId: data.quote_id,
    });
    setOpen(true);
  };

  return (
    <View>
      <Button label="Record payment" variant="outline" onPress={() => void openPanel()} fullWidth />
      {explain && !invoiceId ? (
        <Typography variant="caption" className="mt-2 text-gold">
          {NO_INVOICE_FOR_PAYMENT}
        </Typography>
      ) : null}
      <Modal visible={open} onClose={() => setOpen(false)} title="Record payment">
        {invoice ? (
          <RecordPaymentForm
            invoiceId={invoice.id}
            clientId={invoice.clientId}
            invoiceNumber={invoice.invoiceNumber}
            outstanding={invoice.outstanding}
            quoteId={invoice.quoteId}
            onSaved={() => {
              setOpen(false);
              onSaved?.();
            }}
          />
        ) : null}
      </Modal>
    </View>
  );
}
