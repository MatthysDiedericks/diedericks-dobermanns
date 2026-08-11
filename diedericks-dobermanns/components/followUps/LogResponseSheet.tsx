import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import {
  useLogCheckInResponse,
  type LogResponsePayload,
} from '@/hooks/useOwnerFollowUps';
import type { DueCheckIn, OverallHealth } from '@/lib/followUps/types';

export type LogResponseSheetHandle = {
  open: (item: DueCheckIn) => void;
  close: () => void;
};

const OVERALL: Array<OverallHealth | ''> = [
  '',
  'excellent',
  'good',
  'fair',
  'poor',
  'deceased',
];

export const LogResponseSheet = forwardRef<
  LogResponseSheetHandle,
  { onSaved: () => void }
>(function LogResponseSheet({ onSaved }, ref) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const log = useLogCheckInResponse();
  const [item, setItem] = useState<DueCheckIn | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overall, setOverall] = useState<OverallHealth | ''>('');
  const [weightKg, setWeightKg] = useState('');
  const [dcmScreened, setDcmScreened] = useState<'' | 'yes' | 'no'>('');
  const [dcmResult, setDcmResult] = useState('');
  const [hipsElbows, setHipsElbows] = useState('');
  const [conditions, setConditions] = useState('');
  const [vetPractice, setVetPractice] = useState('');
  const [notes, setNotes] = useState('');
  const [diedAt, setDiedAt] = useState('');
  const [ageAtDeathMonths, setAgeAtDeathMonths] = useState('');
  const [causeOfDeath, setCauseOfDeath] = useState('');
  const [saveTestimonial, setSaveTestimonial] = useState(false);
  const [testimonialText, setTestimonialText] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentEvidence, setConsentEvidence] = useState('');
  const snapPoints = useMemo(() => ['90%'], []);

  const open = useCallback((next: DueCheckIn) => {
    setItem(next);
    setError(null);
    setOverall('');
    setWeightKg('');
    setDcmScreened('');
    setDcmResult('');
    setHipsElbows('');
    setConditions('');
    setVetPractice('');
    setNotes('');
    setDiedAt('');
    setAgeAtDeathMonths('');
    setCauseOfDeath('');
    setSaveTestimonial(false);
    setTestimonialText('');
    setConsentGiven(false);
    setConsentEvidence('');
    sheetRef.current?.present();
  }, []);

  useImperativeHandle(ref, () => ({
    open,
    close: () => sheetRef.current?.dismiss(),
  }));

  const dogLabel = item?.dog?.call_name || item?.dog?.name || 'this dog';
  const deceased = overall === 'deceased' || Boolean(diedAt);

  async function onSave() {
    if (!item) return;
    setSaving(true);
    setError(null);
    try {
      const payload: LogResponsePayload = {
        checkInId: item.id,
        dogId: item.dog_id,
        contactId: item.contact_id,
        overall,
        weightKg,
        dcmScreened,
        dcmResult,
        hipsElbows,
        conditions,
        vetPractice,
        notes,
        diedAt,
        ageAtDeathMonths,
        causeOfDeath,
        saveTestimonial,
        testimonialText,
        consentGiven,
        consentEvidence,
      };
      await log(payload);
      sheetRef.current?.dismiss();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: '#1C1A0E' }}
      handleIndicatorStyle={{ backgroundColor: '#C4A35A' }}
    >
      <BottomSheetScrollView className="px-5 pb-12">
        <Typography variant="subtitle" className="mb-2 text-gold">
          Log response — {dogLabel}
        </Typography>
        {deceased ? (
          <Typography variant="caption" className="mb-3 text-danger">
            This will close all future check-ins for {dogLabel}.
          </Typography>
        ) : null}

        <Typography variant="caption" className="mb-1 text-muted">
          How is the dog?
        </Typography>
        <View className="mb-3 flex-row flex-wrap gap-2">
          {OVERALL.filter(Boolean).map((o) => (
            <Pressable
              key={o}
              onPress={() => setOverall(o)}
              className={`rounded-sm border px-3 py-1 ${
                overall === o ? 'border-gold bg-gold/20' : 'border-gold/30'
              }`}
            >
              <Typography variant="caption" className="text-text">
                {o}
              </Typography>
            </Pressable>
          ))}
        </View>

        <Field label="Weight (kg)" value={weightKg} onChange={setWeightKg} />
        <Field label="DCM result" value={dcmResult} onChange={setDcmResult} />
        <Field label="Hips / elbows" value={hipsElbows} onChange={setHipsElbows} />
        <Field label="Conditions" value={conditions} onChange={setConditions} />
        <Field label="Vet" value={vetPractice} onChange={setVetPractice} />
        <Field label="Notes" value={notes} onChange={setNotes} multiline />

        {deceased ? (
          <>
            <Field label="Died at (YYYY-MM-DD)" value={diedAt} onChange={setDiedAt} />
            <Field
              label="Age at death (months)"
              value={ageAtDeathMonths}
              onChange={setAgeAtDeathMonths}
            />
            <Field label="Cause" value={causeOfDeath} onChange={setCauseOfDeath} />
          </>
        ) : null}

        <Pressable
          onPress={() => setSaveTestimonial((v) => !v)}
          className="mb-2 flex-row items-center gap-2"
        >
          <View
            className={`h-4 w-4 rounded-sm border ${
              saveTestimonial ? 'border-gold bg-gold' : 'border-gold/40'
            }`}
          />
          <Typography variant="caption" className="text-text">
            They said something nice — save as testimonial
          </Typography>
        </Pressable>
        {saveTestimonial ? (
          <View className="mb-3 rounded-sm border border-gold/20 p-3">
            <Field
              label="Their words"
              value={testimonialText}
              onChange={setTestimonialText}
              multiline
            />
            <Pressable
              onPress={() => setConsentGiven((v) => !v)}
              className="mb-2 flex-row items-center gap-2"
            >
              <View
                className={`h-4 w-4 rounded-sm border ${
                  consentGiven ? 'border-gold bg-gold' : 'border-gold/40'
                }`}
              />
              <Typography variant="caption" className="text-text">
                They agreed we can publish this
              </Typography>
            </Pressable>
            {consentGiven ? (
              <Field
                label="Consent evidence"
                value={consentEvidence}
                onChange={setConsentEvidence}
              />
            ) : (
              <Typography variant="caption" className="text-subtle">
                Without consent this stays an internal note.
              </Typography>
            )}
          </View>
        ) : null}

        {error ? (
          <Typography variant="caption" className="mb-2 text-danger">
            {error}
          </Typography>
        ) : null}
        <Button label={saving ? 'Saving…' : 'Save response'} onPress={() => void onSave()} />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <View className="mb-3">
      <Typography variant="caption" className="mb-1 text-muted">
        {label}
      </Typography>
      <BottomSheetTextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        className="rounded-sm border border-gold/30 px-3 py-2 text-text"
        style={{ color: '#F5F0E8', minHeight: multiline ? 72 : undefined }}
      />
    </View>
  );
}
