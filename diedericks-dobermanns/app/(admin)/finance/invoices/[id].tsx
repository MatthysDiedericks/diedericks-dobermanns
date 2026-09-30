import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { InvoiceLinkSection } from '@/components/finance/InvoiceLinkSection';
import { InvoiceStatusBadge } from '@/components/finance/InvoiceStatusBadge';
import { RecurringInvoiceSourceLine } from '@/components/finance/RecurringInvoiceSourceLine';
import { PaymentBankingCard } from '@/components/finance/PaymentBankingCard';
import { PaymentHistoryList } from '@/components/finance/PaymentHistoryList';
import { RecordPaymentForm } from '@/components/finance/RecordPaymentForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import {
  updateInvoiceStatus,
  useInvoiceDetail,
} from '@/hooks/useInvoices';
import { getCachedUser } from '@/lib/auth/getCachedUser';
import { fetchRecurringInvoice } from '@/lib/finance/recurringInvoiceQueries';
import type { RecurringInvoice } from '@/lib/finance/recurringInvoiceTypes';
import { previewInvoiceSend, sendInvoiceToRecipient } from '@/lib/finance/deliverInvoice';
import { exportInvoicePDF } from '@/lib/finance/generatePDF';
import { bankBlocksFromSettings, type BankBlock } from '@/lib/finance/bankDetails';
import { fetchAppSettingsMap } from '@/lib/finance/loadBankSettings';
import { formatAmount, formatDate, humanizeItemType } from '@/lib/finance/formatters';
import {
  invoiceResendConfirmCopy,
  invoiceSentStateLabel,
} from '@/lib/finance/sendInvoice';

export default function FinanceInvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { invoice, loading, refresh } = useInvoiceDetail(id ?? '');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [sendPortal, setSendPortal] = useState(false);
  const [sendResend, setSendResend] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<RecurringInvoice | null>(null);
  const [bankBlocks, setBankBlocks] = useState<BankBlock[]>([]);

  useEffect(() => {
    if (!invoice) {
      setBankBlocks([]);
      return;
    }
    void fetchAppSettingsMap()
      .then((settings) => setBankBlocks(bankBlocksFromSettings(invoice.clientCountry, settings)))
      .catch(() => setBankBlocks([]));
  }, [invoice]);

  useEffect(() => {
    const sid = invoice?.recurring_invoice_id;
    if (!sid) {
      setSchedule(null);
      return;
    }
    void fetchRecurringInvoice(sid).then(setSchedule).catch(() => setSchedule(null));
  }, [invoice?.recurring_invoice_id]);

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

  const openSend = async () => {
    if (!invoice) return;
    setBusy(true);
    try {
      const preview = await previewInvoiceSend(invoice);
      setSendEmail(preview.email);
      setSendPortal(preview.hasPortalAccount);
      setSendResend(invoiceResendConfirmCopy(preview.sendCount));
      setSendOpen(true);
    } catch (e) {
      Alert.alert('Could not send', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmSend = async () => {
    if (!invoice) return;
    setBusy(true);
    try {
      const user = await getCachedUser();
      const result = await sendInvoiceToRecipient(invoice, { actorId: user?.id ?? null });
      setSendOpen(false);
      await refresh();
      Alert.alert('Invoice sent', result.message);
    } catch (e) {
      Alert.alert('Could not send', e instanceof Error ? e.message : 'Please try again.');
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
          {schedule ? (
            <RecurringInvoiceSourceLine
              scheduleId={schedule.id}
              description={schedule.description}
              interval={schedule.recurrence_interval}
              invoiceType={schedule.invoice_type}
            />
          ) : null}
          <Typography variant="caption" className="mt-3">
            Issue {formatDate(invoice.issue_date)} · Due {formatDate(invoice.due_date)}
          </Typography>
          <Typography variant="caption" className="mt-2 text-gold">
            {invoiceSentStateLabel({
              sentAt: invoice.sent_at ?? null,
              sentTo: invoice.sent_to ?? null,
            })}
          </Typography>

          <Typography variant="label" className="mt-6 mb-1">Bill to</Typography>
          <Typography variant="subtitle">{invoice.clientName}</Typography>
          <Typography variant="caption">{invoice.clientEmail}</Typography>
          <InvoiceLinkSection
            invoiceId={invoice.id}
            dogId={invoice.dog_id}
            dogName={invoice.dogName ?? null}
            contactId={invoice.contact_id ?? null}
            invoiceName={invoice.historical_client_name || invoice.clientName}
            onChanged={() => void refresh()}
          />

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

        {invoice.amount_outstanding > 0 ? (
          <View className="mt-3">
            <PaymentBankingCard
              blocks={bankBlocks}
              paymentReference={invoice.invoice_number}
            />
          </View>
        ) : null}

        <PaymentHistoryList payments={invoice.payments} onChanged={() => void refresh()} />

        <View className="mt-6 gap-3">
          {invoice.status !== 'void' && invoice.status !== 'cancelled' ? (
            <Button
              label={invoice.sent_at ? 'Resend' : 'Send invoice'}
              onPress={() => void openSend()}
              loading={busy}
              fullWidth
            />
          ) : null}
          {invoice.amount_outstanding > 0 ? (
            <Button
              label="Record payment"
              variant="secondary"
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
        <RecordPaymentForm
          invoiceId={invoice.id}
          clientId={invoice.client_id}
          invoiceNumber={invoice.invoice_number}
          outstanding={invoice.amount_outstanding}
            onSaved={() => {
              void refresh();
            }}
        />
      </Modal>

      <Modal visible={sendOpen} onClose={() => setSendOpen(false)} title={invoice.sent_at ? 'Resend invoice' : 'Send invoice'}>
        <Typography variant="body">
          Email {invoice.invoice_number} ({formatAmount(invoice.total_amount)}) to {sendEmail}?
        </Typography>
        <Typography variant="caption" className="mt-2">
          {sendPortal
            ? 'The client will also get an in-app notice linking to this invoice in the portal.'
            : 'No portal account on this invoice — email only.'}
        </Typography>
        {sendResend ? (
          <Typography variant="caption" className="mt-2 text-gold">
            {sendResend}
          </Typography>
        ) : null}
        <View className="mt-4 gap-2">
          <Button label={busy ? 'Sending…' : 'Send'} onPress={() => void confirmSend()} loading={busy} fullWidth />
          <Button label="Cancel" variant="secondary" onPress={() => setSendOpen(false)} disabled={busy} fullWidth />
        </View>
      </Modal>
    </ScreenContainer>
  );
}
