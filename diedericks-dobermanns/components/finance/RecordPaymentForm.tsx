import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { recordInvoicePayment } from '@/hooks/useInvoices';
import { pettyCashAccount, type PaymentAccountOption } from '@/lib/finance/cashReceipts';
import { formatAmount } from '@/lib/finance/formatters';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { paymentDateWarning } from '@/lib/finance/proofSource';
import { pickAndStoreStaffProof } from '@/lib/finance/staffProofUpload';
import { UploadValidationError } from '@/lib/uploads/prepare';

const METHODS = ['eft', 'cash', 'card', 'other'] as const;

export function RecordPaymentForm({
  invoiceId,
  clientId,
  invoiceNumber,
  outstanding,
  quoteId,
  onSaved,
}: {
  invoiceId: string;
  clientId: string | null;
  invoiceNumber: string;
  outstanding: number;
  quoteId?: string | null;
  onSaved: (message: string) => void;
}) {
  const [amount, setAmount] = useState(String(Math.max(0, outstanding)));
  const [paidAt, setPaidAt] = useState('');
  const [method, setMethod] = useState<(typeof METHODS)[number]>('eft');
  const [accounts, setAccounts] = useState<PaymentAccountOption[]>([]);
  const [accountId, setAccountId] = useState('');
  const [reference, setReference] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const receiverName = useAuthStore((s) => s.profile?.full_name) ?? 'Signed-in staff';
  const [proofName, setProofName] = useState<string | null>(null);
  const [proofId, setProofId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateWarn = paymentDateWarning(paidAt);

  useEffect(() => {
    const supabase = requireSupabase();
    void supabase
      .from('payment_accounts')
      .select('id, name, account_type')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setAccounts(
          (data ?? []).map((row) => ({
            id: row.id,
            name: row.name,
            accountType: row.account_type,
          })),
        );
      });
  }, []);

  const chooseMethod = (next: (typeof METHODS)[number]) => {
    setMethod(next);
    if (next === 'cash') {
      const petty = pettyCashAccount(accounts);
      if (petty) setAccountId(petty.id);
    }
  };

  const attach = async (source: 'library' | 'camera') => {
    setError(null);
    try {
      const stored = await pickAndStoreStaffProof({
        invoiceId,
        clientId,
        invoiceNumber,
        quoteId,
        source,
      });
      if (!stored) return;
      setProofId(stored.documentId);
      setProofName(stored.fileName);
    } catch (e) {
      setError(
        e instanceof UploadValidationError || e instanceof Error
          ? e.message
          : 'That file could not be attached.',
      );
    }
  };

  const save = async () => {
    const n = Number(amount);
    if (!(n > 0)) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (!paidAt.trim()) {
      setError('Date paid is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await recordInvoicePayment(invoiceId, n, paidAt, method, reference, {
        proof_document_id: proofId,
        notes: proofId ? 'Proof added by staff' : null,
        paymentAccountId: accountId || null,
      });
      setNotice(saved.message);
      setPaidAt('');
      setReference('');
      setProofId(null);
      setProofName(null);
      setAmount(String(Math.max(0, outstanding - n)));
      onSaved(saved.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record the payment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Typography variant="caption" className="mb-3 text-subtle">
        Outstanding {formatAmount(outstanding)}. Proof is optional.
      </Typography>
      <Input
        value={amount}
        onChangeText={setAmount}
        placeholder="Amount"
        keyboardType="numeric"
        className="mb-3"
      />
      <DateField label="Date paid" value={paidAt} onChange={setPaidAt} />
      {dateWarn ? (
        <Typography variant="caption" className="mb-3 text-gold">
          {dateWarn}
        </Typography>
      ) : null}
      <Typography variant="caption" className="mb-2 text-subtle">
        Method
      </Typography>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {METHODS.map((m) => (
          <Pressable
            key={m}
            onPress={() => chooseMethod(m)}
            className={`rounded-lg border px-3 py-2 ${
              method === m ? 'border-gold bg-gold/20' : 'border-gold/20'
            }`}
          >
            <Typography variant="caption" className="uppercase">
              {m}
            </Typography>
          </Pressable>
        ))}
      </View>
      <Typography variant="caption" className="mb-2 text-subtle">
        Account that received it
      </Typography>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {accounts.map((account) => (
          <Pressable
            key={account.id}
            onPress={() => setAccountId(account.id)}
            className={`rounded-lg border px-3 py-2 ${
              accountId === account.id ? 'border-gold bg-gold/20' : 'border-gold/20'
            }`}
          >
            <Typography variant="caption">{account.name}</Typography>
          </Pressable>
        ))}
      </View>
      <Typography variant="caption" className="mb-3 text-subtle">
        Received by {receiverName}
      </Typography>
      <Input
        value={reference}
        onChangeText={setReference}
        placeholder="Bank reference"
        className="mb-3"
      />
      <View className="mb-3 flex-row gap-2">
        <Pressable
          onPress={() => void attach('library')}
          className="flex-1 rounded-lg border border-gold/40 px-3 py-2"
        >
          <Typography variant="caption" className="text-center text-gold">
            Photo library
          </Typography>
        </Pressable>
        <Pressable
          onPress={() => void attach('camera')}
          className="flex-1 rounded-lg border border-gold/40 px-3 py-2"
        >
          <Typography variant="caption" className="text-center text-gold">
            Camera
          </Typography>
        </Pressable>
      </View>
      <Typography variant="caption" className="mb-3 text-subtle">
        {proofName
          ? `${proofName} — saved as staff-provided, never as a buyer upload.`
          : method === 'cash'
            ? 'Photo of the signed receipt is optional.'
            : 'Proof is optional. A WhatsApp screenshot is the normal case.'}
      </Typography>
      {notice ? (
        <Typography variant="caption" className="mb-3 text-success">
          {notice}
        </Typography>
      ) : null}
      {error ? (
        <Typography variant="caption" className="mb-3 text-danger">
          {error}
        </Typography>
      ) : null}
      <Button label="Record payment" onPress={() => void save()} loading={busy} fullWidth />
    </View>
  );
}
