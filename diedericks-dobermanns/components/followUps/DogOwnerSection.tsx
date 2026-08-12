import { Linking, View } from 'react-native';

import { DetailRow } from '@/components/dogs/detail/DetailRow';
import { SectionCard } from '@/components/dogs/detail/SectionCard';
import { Typography } from '@/components/ui/Typography';
import {
  useDogCheckInHistory,
  useOwnerHealthReports,
} from '@/hooks/useOwnerHealthReports';
import { contactabilityBlockReason } from '@/lib/followUps/contactability';
import { KIND_LABELS, OWNERSHIP_LABELS, type OwnershipStatus } from '@/lib/followUps/types';
import type { Dog } from '@/types/app.types';

type OwnerContact = {
  id: string;
  full_name: string;
  phone: string | null;
  whatsapp_number: string | null;
  email: string | null;
};

export function DogOwnerSection({
  dog,
  contact,
}: {
  dog: Dog & {
    owner_contact_id?: string | null;
    placement_date?: string | null;
    ownership_status?: OwnershipStatus | null;
    ownership_notes?: string | null;
    do_not_contact?: boolean | null;
    deceased_at?: string | null;
    new_owner_name?: string | null;
    reserved_for_name?: string | null;
  };
  contact?: OwnerContact | null;
}) {
  const { reports, loading: reportsLoading, error: reportsError } = useOwnerHealthReports(
    dog.id,
  );
  const { items: checkIns, loading: ciLoading, error: ciError } = useDogCheckInHistory(
    dog.id,
  );

  const status = (dog.ownership_status ?? 'unknown') as OwnershipStatus;
  const phone = contact?.whatsapp_number || contact?.phone || null;
  const blockReason = contactabilityBlockReason({
    do_not_contact: dog.do_not_contact,
    deceased_at: dog.deceased_at,
    status: dog.status,
    ownership_status: status,
  });

  return (
    <View>
      {blockReason ? (
        <SectionCard title="Contact">
          <Typography variant="caption" className="text-amber-300">
            {blockReason}
          </Typography>
        </SectionCard>
      ) : null}
      <SectionCard title="Owner">
        <DetailRow label="Contact" value={contact?.full_name ?? dog.new_owner_name ?? dog.reserved_for_name} />
        <DetailRow label="Phone" value={phone} />
        <DetailRow label="Email" value={contact?.email} />
        <DetailRow label="Placement" value={dog.placement_date} />
        <DetailRow label="Ownership" value={OWNERSHIP_LABELS[status]} />
        <DetailRow
          label="Do not contact"
          value={dog.do_not_contact ? 'Yes' : 'No'}
        />
        <DetailRow label="Notes" value={dog.ownership_notes} />
        {phone ? (
          <Typography
            variant="caption"
            className="mt-2 text-gold"
            onPress={() => Linking.openURL(`tel:${phone}`)}
          >
            Call owner
          </Typography>
        ) : null}
      </SectionCard>

      <SectionCard title="Check-in history">
        {ciLoading ? (
          <Typography variant="caption" className="text-subtle">
            Loading…
          </Typography>
        ) : null}
        {ciError ? (
          <Typography variant="caption" className="text-danger">
            {ciError}
          </Typography>
        ) : null}
        {!ciLoading && !ciError && checkIns.length === 0 ? (
          <Typography variant="caption" className="text-subtle">
            No check-ins yet.
          </Typography>
        ) : null}
        {checkIns.slice(0, 8).map((c) => (
          <View key={c.id} className="mb-2 border-b border-gold/10 pb-2">
            <Typography variant="caption" className="text-text">
              {(KIND_LABELS as Record<string, string>)[c.kind] ?? c.kind} · {c.due_date} ·{' '}
              {c.status}
            </Typography>
            {c.response_notes ? (
              <Typography variant="caption" className="text-muted">
                {c.response_notes}
              </Typography>
            ) : null}
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Owner health reports">
        {reportsLoading ? (
          <Typography variant="caption" className="text-subtle">
            Loading…
          </Typography>
        ) : null}
        {reportsError ? (
          <Typography variant="caption" className="text-danger">
            {reportsError}
          </Typography>
        ) : null}
        {!reportsLoading && !reportsError && reports.length === 0 ? (
          <Typography variant="caption" className="text-subtle">
            No owner reports yet.
          </Typography>
        ) : null}
        {reports.slice(0, 8).map((r) => (
          <View key={r.id} className="mb-2 border-b border-gold/10 pb-2">
            <Typography variant="caption" className="text-text">
              {r.reported_at} · {r.overall ?? '—'}
              {r.weight_kg != null ? ` · ${r.weight_kg} kg` : ''}
            </Typography>
            {r.conditions?.length ? (
              <Typography variant="caption" className="text-muted">
                {r.conditions.join(', ')}
              </Typography>
            ) : null}
          </View>
        ))}
      </SectionCard>
    </View>
  );
}
