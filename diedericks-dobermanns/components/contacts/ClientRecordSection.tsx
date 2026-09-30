import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import type { ClientRecord, PipelineRow } from '@/lib/clients/clientRecord';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import { OWNERSHIP_LABELS, type OwnershipStatus } from '@/lib/followUps/types';

function Money({ label, value, amber }: { label: string; value: number; amber?: boolean }) {
  return (
    <View className="flex-1">
      <Typography variant="caption">{label}</Typography>
      <Typography variant="label" className={amber && value !== 0 ? 'text-amber-300' : 'text-gold'}>
        {formatAmount(value)}
      </Typography>
    </View>
  );
}

function Rows({ title, rows }: { title: string; rows: PipelineRow[] }) {
  const router = useRouter();
  if (rows.length === 0) return null;
  return (
    <View className="mt-3">
      <Typography variant="caption" className="mb-1 text-gold">
        {title}
      </Typography>
      {rows.map((row) => (
        <Pressable key={row.id} onPress={() => router.push(row.href as never)}>
          <Typography variant="body">{row.label}</Typography>
          <Typography variant="caption">{row.meta}</Typography>
        </Pressable>
      ))}
    </View>
  );
}

export function ClientRecordSection({ record }: { record: ClientRecord }) {
  const router = useRouter();
  return (
    <View className="mt-6">
      <Typography variant="label" className="mb-2 text-gold">
        ACCOUNT
      </Typography>
      <Card className="flex-row gap-3">
        <Money label="Invoiced" value={record.money.invoiced} />
        <Money label="Paid" value={record.money.paid} />
        <Money label="Outstanding" value={record.money.outstanding} amber />
      </Card>
      <Typography variant="caption" className="mt-2">
        Paid is the sum of payment records.
      </Typography>

      <Typography variant="label" className="mb-2 mt-6 text-gold">
        INVOICES
      </Typography>
      {record.invoices.length === 0 ? (
        <Typography variant="body">No invoices linked to this contact.</Typography>
      ) : (
        record.invoices.map((invoice) => (
          <Pressable key={invoice.id} onPress={() => router.push(invoice.href as never)}>
            <Card className="mb-2">
              <Typography variant="label" className="text-gold">
                {invoice.invoiceNumber}
              </Typography>
              <Typography variant="caption">
                {formatDate(invoice.issueDate)} · {invoice.status.replace(/_/g, ' ')} ·{' '}
                {formatAmount(invoice.outstanding)} outstanding
              </Typography>
              {invoice.ledgerWarning ? (
                <Typography variant="caption" className="text-amber-300">
                  {invoice.ledgerWarning}
                </Typography>
              ) : null}
            </Card>
          </Pressable>
        ))
      )}

      <Typography variant="label" className="mb-2 mt-4 text-gold">
        PAYMENTS
      </Typography>
      {record.payments.length === 0 ? (
        <Typography variant="body">No payments recorded.</Typography>
      ) : (
        record.payments.map((payment) => (
          <Pressable
            key={payment.id}
            onPress={() => router.push(`/(admin)/finance/invoices/${payment.invoiceId}` as never)}
          >
            <Card className="mb-2">
              <Typography variant="body">
                {payment.invoiceNumber} · {formatDate(payment.paymentDate)} · {formatAmount(payment.amount)}
              </Typography>
              <Typography variant="caption">
                {payment.method || '—'}
                {payment.reference ? ` · ${payment.reference}` : ''}
              </Typography>
              {payment.notes ? <Typography variant="caption">{payment.notes}</Typography> : null}
            </Card>
          </Pressable>
        ))
      )}

      <Typography variant="label" className="mb-2 mt-4 text-gold">
        DOGS
      </Typography>
      {record.dogs.length === 0 ? (
        <Typography variant="body">No dogs linked yet.</Typography>
      ) : (
        record.dogs.map((dog) => (
          <Pressable key={dog.id} onPress={() => router.push(dog.href as never)}>
            <Card className="mb-2">
              <Typography variant="label" className="text-gold">
                {dog.name}
              </Typography>
              <Typography variant="caption">
                {dog.role} · {OWNERSHIP_LABELS[(dog.ownershipStatus as OwnershipStatus) ?? 'unknown']}
                {dog.invoices.length
                  ? ` · invoice ${dog.invoices.map((invoice) => invoice.invoiceNumber).join(', ')}`
                  : ' · no invoice linked'}
              </Typography>
            </Card>
          </Pressable>
        ))
      )}

      <Typography variant="label" className="mb-2 mt-4 text-gold">
        APPLICATION HISTORY
      </Typography>
      {record.pipelineCopy ? (
        <Typography variant="body">{record.pipelineCopy}</Typography>
      ) : (
        <View>
          <Rows title="Waiting list" rows={record.waitingList} />
          <Rows title="Quotes" rows={record.quotes} />
          <Rows title="Applications" rows={record.applications} />
        </View>
      )}
    </View>
  );
}
