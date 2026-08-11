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
import { useMatings } from '@/hooks/useMatings';
import type { HeatCycleRecord } from '@/lib/heats/constants';
import { MATING_TYPES } from '@/lib/heats/constants';
import { requireSupabase } from '@/lib/supabase';

export interface MatingAddSheetHandle {
  open: () => void;
  close: () => void;
}

export const MatingAddSheet = forwardRef<
  MatingAddSheetHandle,
  { cycle: HeatCycleRecord; onSaved: () => void }
>(function MatingAddSheet({ cycle, onSaved }, ref) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const { addMating } = useMatings(cycle.id);
  const [matedAt, setMatedAt] = useState('');
  const [matingType, setMatingType] = useState('natural');
  const [sireId, setSireId] = useState(cycle.sire_id ?? '');
  const [external, setExternal] = useState('');
  const [tie, setTie] = useState('');
  const [notes, setNotes] = useState('');
  const [males, setMales] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const snapPoints = useMemo(() => ['80%'], []);

  const open = useCallback(() => {
    setMatedAt(new Date().toISOString().slice(0, 16).replace('T', ' '));
    setError(null);
    void requireSupabase()
      .from('dogs')
      .select('id, name')
      .eq('sex', 'male')
      .order('name')
      .then(({ data }) => setMales((data ?? []) as { id: string; name: string }[]));
    sheetRef.current?.present();
  }, []);

  useImperativeHandle(ref, () => ({
    open,
    close: () => sheetRef.current?.dismiss(),
  }));

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const iso = matedAt.includes('T')
        ? new Date(matedAt).toISOString()
        : new Date(matedAt.replace(' ', 'T')).toISOString();
      await addMating({
        mated_at: iso,
        mating_type: matingType,
        sire_id: sireId || null,
        external_sire_name: external.trim() || null,
        tie_minutes: tie ? Number(tie) : null,
        notes,
      });
      sheetRef.current?.dismiss();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save mating');
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
      <BottomSheetScrollView className="px-5 pb-10">
        <Typography variant="subtitle" className="mb-4 text-gold">
          Add mating
        </Typography>
        <Field label="Date & time (YYYY-MM-DD HH:mm)" value={matedAt} onChange={setMatedAt} />
        <Typography variant="caption" className="mb-2 text-muted">
          Method
        </Typography>
        <View className="mb-3 flex-row flex-wrap gap-2">
          {MATING_TYPES.map((t) => (
            <Pressable
              key={t.value}
              onPress={() => setMatingType(t.value)}
              className={`rounded-full border px-3 py-1.5 ${
                matingType === t.value ? 'border-gold bg-gold/15' : 'border-gold/20'
              }`}
            >
              <Typography variant="caption">{t.label}</Typography>
            </Pressable>
          ))}
        </View>
        <Typography variant="caption" className="mb-2 text-muted">
          Sire
        </Typography>
        {males.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => {
              setSireId(m.id);
              setExternal('');
            }}
            className={`mb-2 rounded-lg border px-3 py-2 ${
              sireId === m.id ? 'border-gold bg-gold/10' : 'border-gold/15'
            }`}
          >
            <Typography variant="body">{m.name}</Typography>
          </Pressable>
        ))}
        <Field
          label="Or outside stud name"
          value={external}
          onChange={(v) => {
            setExternal(v);
            if (v) setSireId('');
          }}
        />
        <Field label="Tie minutes" value={tie} onChange={setTie} />
        <Field label="Notes" value={notes} onChange={setNotes} multiline />
        {error ? (
          <Typography variant="caption" className="mb-2 text-danger">
            {error}
          </Typography>
        ) : null}
        <Button label="Save" onPress={() => void onSave()} loading={saving} fullWidth />
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
        placeholderTextColor="#8C8474"
        multiline={multiline}
        className="rounded-xl border border-gold/20 bg-[#111008] px-4 py-3 font-body text-ink"
        style={multiline ? { minHeight: 72, textAlignVertical: 'top' } : undefined}
      />
    </View>
  );
}
