import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { InviteToPortalButton } from '@/components/admin/InviteToPortalButton';
import { InviteStateChip } from '@/components/admin/InviteStateChip';
import { ApprovalQuoteStatus } from '@/components/applications/ApprovalQuoteStatus';
import { ApplicationArchiveBlock } from '@/components/applications/ApplicationArchiveBlock';
import { PendingChangesAdminBlock } from '@/components/applications/PendingChangesAdminBlock';
import { ApplicationVersionsBlock } from '@/components/applications/ApplicationVersionsBlock';
import { ReturningBuyerCard } from '@/components/applications/ReturningBuyerCard';
import { IdCheckBlock } from '@/components/applications/IdCheckBlock';
import { labelFor } from '@/components/forms/ApplicationForm/labels';
import type { ApplicationFormValues } from '@/components/forms/ApplicationForm/schema';
import { DocumentSection } from '@/components/documents/DocumentList';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useApplicationDetail } from '@/hooks/useAdmin';
import { useLinkedQuote, type LinkedQuote } from '@/hooks/useLinkedQuote';
import { createWaitlistFromApplication, reviewApplication, useSubmitting } from '@/hooks/useMutations';
import { useWaitlistTypes } from '@/hooks/useWaitingList';
import { fetchInviteStates, type InviteStateRow } from '@/lib/portal/invite';
import { titleCase } from '@/lib/format';
import { PAYMENT_GATE_MESSAGE, isWaitlistPaymentGateError } from '@/lib/waitlist/paymentGate';
import type { Application, ApplicationStatus } from '@/types/app.types';

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View className="border-b border-gold/10 py-3">
      <Typography variant="caption">{label}</Typography>
      <Typography variant="body" className="mt-1">{value}</Typography>
    </View>
  );
}

function EnumField<K extends keyof ApplicationFormValues>({ label, field, value }: {
  label: string; field: K; value: string | null | undefined;
}) {
  if (!value) return null;
  return <Field label={label} value={labelFor(field, value as ApplicationFormValues[K])} />;
}

const ACTIONS: { status: ApplicationStatus; label: string; variant: 'primary' | 'danger' | 'secondary' }[] = [
  { status: 'approved', label: 'Approve', variant: 'primary' },
  { status: 'waitlisted', label: 'Waitlist', variant: 'secondary' },
  { status: 'rejected', label: 'Reject', variant: 'danger' },
];

function needsFollowUp(app: Application) {
  return (
    app.aware_of_dcm === 'not_aware' ||
    app.aware_of_commitment === 'need_more_info' ||
    app.aware_of_costs === 'need_cost_breakdown'
  );
}

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { application: app, loading, error, refresh } = useApplicationDetail(id);
  const { types } = useWaitlistTypes();
  const { submitting, run } = useSubmitting();
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState<ApplicationStatus | null>(null);
  const [addingWl, setAddingWl] = useState(false);
  const [needsOverride, setNeedsOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [inviteState, setInviteState] = useState<InviteStateRow | null>(null);
  const { linkedQuote, quotePending, quoteFailed, pollAfterApproval } = useLinkedQuote(id);

  useEffect(() => {
    if (!app?.email) return;
    void fetchInviteStates([app.email]).then((map) =>
      setInviteState(map.get(app.email.toLowerCase()) ?? null),
    );
  }, [app?.email]);

  function openQuote(quote: LinkedQuote) {
    router.push({ pathname: '/(admin)/quotes/[id]', params: { id: quote.id } });
  }

  async function addToWaitlist() {
    if (!app || !id) return;
    const listType = types.find((t) => t.slug !== 'do-not-sell') ?? types[0];
    if (!listType) return;
    if (needsOverride && overrideReason.trim().length < 3) {
      Alert.alert('Override reason', 'Give a reason (cash deposit, arrangement made).');
      return;
    }
    setAddingWl(true);
    const { error: err, id: wlId } = await run(() =>
      createWaitlistFromApplication(app, listType.id, {
        override_reason: needsOverride ? overrideReason.trim() : undefined,
      }),
    );
    setAddingWl(false);
    if (err && (isWaitlistPaymentGateError(err) || err === PAYMENT_GATE_MESSAGE)) {
      setNeedsOverride(true);
      Alert.alert('Payment required', PAYMENT_GATE_MESSAGE);
      return;
    }
    if (err) {
      Alert.alert('Could not add', err);
      return;
    }
    if (wlId) router.push({ pathname: '/(admin)/waitlist/[id]', params: { id: wlId } });
  }

  async function act(status: ApplicationStatus) {
    if (!id) return;
    const { error: err } = await run(() => reviewApplication(id, status, notes || null));
    if (!err) {
      setDone(status);
      if (status === 'approved') {
        // Quote creation runs in the background (see reviewApplication) — stay on
        // this screen and poll for it rather than auto-navigating away.
        void pollAfterApproval(id);
      } else {
        setTimeout(() => router.back(), 900);
      }
    }
  }

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  if (error || !app) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center px-6">
        <Typography variant="subtitle" className="text-danger">
          {error ?? 'Application not found.'}
        </Typography>
        <Button label="Back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Application" title={app.full_name} />
      <View className="px-6">
        <View className="mb-4 flex-row flex-wrap gap-2">
          <Badge label={titleCase(done ?? app.status)} tone="gold" />
          {app.status === 'approved' || done === 'approved' ? (
            <InviteStateChip state={inviteState} />
          ) : null}
          {needsFollowUp(app) ? (
            <Badge label="Follow-up needed" tone="danger" />
          ) : null}
        </View>

        {app.previous_application_id ? (
          <ReturningBuyerCard previousId={app.previous_application_id} />
        ) : null}

        {app.status === 'changes_pending' ? (
          <PendingChangesAdminBlock
            applicationId={app.id}
            phone={app.phone}
            fullName={app.full_name}
            onDone={() => void refresh()}
          />
        ) : null}

        {linkedQuote && done !== 'approved' ? (
          <Typography
            variant="caption"
            className="mb-4 text-gold underline"
            onPress={() => openQuote(linkedQuote)}
          >
            View quote {linkedQuote.quote_number ?? ''} →
          </Typography>
        ) : null}

        {done === 'approved' ? (
          <ApprovalQuoteStatus
            quotePending={quotePending}
            quoteFailed={quoteFailed}
            linkedQuote={linkedQuote}
            onViewQuote={openQuote}
            onCreateQuote={() =>
              router.push({
                pathname: '/(admin)/quotes/new',
                params: { applicationId: id ?? '' },
              })
            }
            onBack={() => router.back()}
          />
        ) : null}

        {needsFollowUp(app) ? (
          <Card className="mb-4 border border-amber-500/40 bg-amber-500/10">
            <Typography variant="subtitle" className="text-amber-400">
              Admin follow-up recommended
            </Typography>
            <Typography variant="bodyMuted" className="mt-2">
              The applicant indicated they need more information on DCM, commitment, or costs before
              proceeding. Contact them before approving.
            </Typography>
          </Card>
        ) : null}

        <IdCheckBlock app={app} onDone={() => void refresh()} />

        <Card>
          <Typography variant="label" className="mb-2 text-gold">Personal</Typography>
          <Field label="Email" value={app.email} />
          <Field label="Phone" value={app.phone} />
          <Field label="Occupation" value={app.occupation} />
          <Field label="Employer" value={app.employer} />
          <Field label="Address" value={app.address} />
          <Field label="Location" value={[app.city, app.province, app.country].filter(Boolean).join(', ')} />
          <Field label="Instagram" value={app.instagram_handle} />
          <Field label="Facebook" value={app.facebook_profile} />
        </Card>

        <Card className="mt-4">
          <Typography variant="label" className="mb-2 text-gold">Home & Lifestyle</Typography>
          <EnumField label="Home type" field="home_type" value={app.home_type} />
          <EnumField label="Secure yard" field="has_secure_yard" value={app.has_secure_yard} />
          <EnumField label="Yard size" field="yard_size" value={app.yard_size} />
          <EnumField label="Sleeping" field="sleeping_arrangement" value={app.sleeping_arrangement} />
          <EnumField label="Hours alone" field="hours_alone_per_day" value={app.hours_alone_per_day} />
          <EnumField label="Activity level" field="exercise_level" value={app.exercise_level} />
          <Field label="Current pets" value={app.current_pets} />
          <Field label="Children" value={app.children_ages} />
        </Card>

        <Card className="mt-4">
          <Typography variant="label" className="mb-2 text-gold">Experience & Due Diligence</Typography>
          <Field label="Why Dobermann" value={app.why_dobermann} />
          <EnumField label="Experience level" field="dobermann_experience_level" value={app.dobermann_experience_level} />
          <EnumField label="DCM awareness" field="aware_of_dcm" value={app.aware_of_dcm} />
          <EnumField label="Commitment" field="aware_of_commitment" value={app.aware_of_commitment} />
          <EnumField label="Cost readiness" field="aware_of_costs" value={app.aware_of_costs} />
          <Field label="Previous dogs" value={app.previous_dog_fate} />
          <Field label="Additional notes" value={app.experience_with_dobermanns} />
          <Field label="Vet" value={[app.vet_name, app.vet_phone].filter(Boolean).join(' · ')} />
          <Field label="Reference" value={[app.personal_reference_name, app.personal_reference_phone].filter(Boolean).join(' · ')} />
        </Card>

        <Card className="mt-4">
          <Typography variant="label" className="mb-2 text-gold">Puppy Preferences</Typography>
          <EnumField label="Interest" field="dog_interest" value={app.dog_interest} />
          <EnumField label="Purpose" field="purpose" value={app.purpose} />
          <EnumField label="Sex" field="preferred_sex" value={app.preferred_sex} />
          <EnumField label="Colour" field="preferred_colour" value={app.preferred_colour} />
          <EnumField label="Tail preference" field="tail_preference" value={app.tail_preference} />
          <EnumField label="Timeline" field="preferred_timeline" value={app.preferred_timeline} />
          <EnumField label="Budget" field="budget_range" value={app.budget_range} />
          <Field label="Training planned" value={app.training_planned ? 'Yes' : 'No'} />
          <Field label="Security / training goals" value={app.security_requirements} />
          <Field label="Special requests" value={app.special_requests} />
          <Field label="Delivery acknowledged" value={app.delivery_acknowledged ? 'Yes' : 'No'} />
        </Card>

        <Card className="mt-4">
          <Typography variant="label" className="mb-2 text-gold">Legal Agreements</Typography>
          <Field label="No breeding rights" value={app.agreed_no_breeding_rights ? '✓ Agreed' : null} />
          <Field label="Right of recall" value={app.agreed_right_of_recall ? '✓ Agreed' : null} />
          <Field label="No resale" value={app.agreed_no_resale ? '✓ Agreed' : null} />
          <Field label="Welfare commitment" value={app.agreed_welfare_commitment ? '✓ Agreed' : null} />
          <Field label="Microchip policy" value={app.agreed_microchip_policy ? '✓ Agreed' : null} />
          <Field label="Terms & Conditions" value={app.agreed_to_terms ? '✓ Agreed' : null} />
        </Card>

        {id ? <DocumentSection entityType="application" entityId={id} /> : null}

        {id ? <ApplicationVersionsBlock applicationId={id} /> : null}

        <View className="mt-6">
          <Input
            label="Admin notes"
            value={notes}
            onChangeText={setNotes}
            placeholder={app.admin_notes ?? 'Internal notes about this application...'}
            multiline
            numberOfLines={3}
            className="h-24"
          />
        </View>

        <View className="mt-2 gap-3 pb-8">
          {app.status === 'approved' || done === 'approved' ? (
            <>
              <InviteToPortalButton email={app.email} fullName={app.full_name} phone={app.phone} source="application" sourceId={app.id} initialState={inviteState} />
              {needsOverride ? (
                <Input
                  label="Override reason (required — recorded in the audit log)"
                  value={overrideReason}
                  onChangeText={setOverrideReason}
                  placeholder="Cash deposit received at the kennel"
                />
              ) : null}
              <Button
                label={needsOverride ? 'Override and add to waiting list' : 'Add to Waiting List'}
                variant="outline"
                onPress={() => void addToWaitlist()}
                loading={addingWl}
                fullWidth
              />
            </>
          ) : null}
          {ACTIONS.filter((a) => !(app.status === 'changes_pending' && a.status === 'approved')).map((a) => (
            <Button
              key={a.status}
              label={a.label}
              variant={a.variant}
              onPress={() => act(a.status)}
              loading={submitting}
              fullWidth
            />
          ))}
          <ApplicationArchiveBlock
            applicationId={app.id}
            archivedAt={app.archived_at}
            archivedReason={app.archived_reason}
            onDone={() => void refresh()}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}
