import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { InvoiceStatusBadge } from '@/components/finance/InvoiceStatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import {
  recordInvoicePayment,
  updateInvoiceStatus,
  useInvoiceDetail,
} from '@/hooks/useInvoices';
import { exportInvoicePDF } from '@/lib/finance/generatePDF';
import { formatAmount, formatDate, humanizeItemType } from '@/lib/finance/formatters';

export default function FinanceInvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { invoice, loading, refresh } = useInvoiceDetail(id ?? '');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState('');
  const [payRef, setPayRef] = useState('');
  const [busy, setBusy] = useState(false);

  const handlePayment = async () => {
    if (!invoice) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return;
    setBusy(true);
    try {
      await recordInvoicePayment(invoice.id, amount, payDate, payMethod, payRef);
      setPaymentOpen(false);
      setPayAmount('');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleVoid = async () => {
    if (!invoice) return;
    setBusy(true);
    try {
      await updateInvoiceStatus(invoice.id, 'void');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleMarkSent = async () => {
    if (!invoice) return;
    setBusy(true);
    try {
      await updateInvoiceStatus(invoice.id, 'sent');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  if (loading || !invoice) {
    return (
      <ScreenContainer>
        <PageHeader eyebrow="Finance" title="Invoice" />
        <CardListSkeleton count={3} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View className="flex-row items-start justify-between px-6">
        <PageHeader eyebrow="Finance" title="Invoice" />
        <Pressable
          onPress={() => exportInvoicePDF(invoice)}
          className="mt-8 h-10 w-10 items-center justify-center rounded-full border border-gold/30"
        >
          <Ionicons name="share-outline" size={20} color={Colors.gold} />
        </Pressable>
      </View>

      <ScrollView className="px-6 pb-12">
        <Card>
          <Typography variant="label" className="font-mono text-gold">
            {invoice.invoice_number}
          </Typography>
          <InvoiceStatusBadge status={invoice.status} />
          <Typography variant="caption" className="mt-3">
            Issue {formatDate(invoice.issue_date)} · Due {formatDate(invoice.due_date)}
          </Typography>

          <Typography variant="label" className="mt-6 mb-1">Bill to</Typography>
          <Typography variant="subtitle">{invoice.clientName}</Typography>
          <Typography variant="caption">{invoice.clientEmail}</Typography>

          <View className="mt-6 border-t border-gold/20 pt-4">
            {invoice.items.map((item) => (
              <View key={item.id} className="mb-3 flex-row justify-between">
                <View className="flex-1 pr-4">
                  <Typography variant="body">{item.description}</Typography>
                  <Typography variant="caption">
                    {humanizeItemType(item.item_type)} · {item.quantity} × {formatAmount(item.unit_price)}
                  </Typography>
                </View>
                <Typography variant="label">{formatAmount(item.line_total)}</Typography>
              </View>
            ))}
          </View>

          <View className="mt-4 border-t border-gold/20 pt-4">
            <View className="flex-row justify-between">
              <Typography variant="body">Subtotal</Typography>
              <Typography variant="label">{formatAmount(invoice.subtotal)}</Typography>
            </View>
            {invoice.discount_amount > 0 ? (
              <View className="flex-row justify-between mt-1">
                <Typography variant="body">Discount</Typography>
                <Typography variant="label">-{formatAmount(invoice.discount_amount)}</Typography>
              </View>
            ) : null}
            <View className="flex-row justify-between mt-2">
              <Typography variant="subtitle">Total</Typography>
              <Typography variant="display" className="text-gold">
                {formatAmount(invoice.total_amount)}
              </Typography>
            </View>
            <View className="flex-row justify-between mt-2">
              <Typography variant="body" className="text-success">Paid</Typography>
              <Typography variant="label" className="text-success">
                {formatAmount(invoice.amount_paid)}
              </Typography>
            </View>
            {invoice.amount_outstanding > 0 ? (
              <View className="flex-row justify-between mt-1">
                <Typography variant="body" className="text-danger">Outstanding</Typography>
                <Typography variant="label" className="text-danger">
                  {formatAmount(invoice.amount_outstanding)}
                </Typography>
              </View>
            ) : null}
          </View>

          {invoice.notes ? (
            <Typography variant="caption" className="mt-4 text-subtle">{invoice.notes}</Typography>
          ) : null}
        </Card>

        {invoice.payments.length > 0 ? (
          <View className="mt-6">
            <Typography variant="label" className="mb-2">Payment history</Typography>
            {invoice.payments.map((p) => (
              <Card key={p.id} className="mb-2 flex-row justify-between">
                <Typography variant="body">{formatDate(p.payment_date)}</Typography>
                <Typography variant="label" className="text-success">
                  {formatAmount(p.amount)}
                </Typography>
              </Card>
            ))}
          </View>
        ) : null}

        <View className="mt-6 gap-3">
          {invoice.amount_outstanding > 0 ? (
            <Button
              label="Record payment"
              onPress={() => setPaymentOpen(true)}
              loading={busy}
              fullWidth
            />
          ) : null}
          {invoice.status === 'draft' ? (
            <Button
              label="Mark as sent"
              variant="secondary"
              onPress={handleMarkSent}
              loading={busy}
              fullWidth
            />
          ) : null}
          {invoice.status !== 'void' && invoice.status !== 'paid' ? (
            <Button
              label="Mark void"
              variant="danger"
              onPress={handleVoid}
              loading={busy}
              fullWidth
            />
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={paymentOpen} onClose={() => setPaymentOpen(false)} title="Record payment">
        <Input
          value={payAmount}
          onChangeText={setPayAmount}
          placeholder="Amount"
          keyboardType="numeric"
          className="mb-3"
        />
        <Input value={payDate} onChangeText={setPayDate} placeholder="Date YYYY-MM-DD" className="mb-3" />
        <Input value={payMethod} onChangeText={setPayMethod} placeholder="Method" className="mb-3" />
        <Input value={payRef} onChangeText={setPayRef} placeholder="Reference" className="mb-4" />
        <Button label="Save payment" onPress={handlePayment} loading={busy} fullWidth />
      </Modal>
    </ScreenContainer>
  );
}
