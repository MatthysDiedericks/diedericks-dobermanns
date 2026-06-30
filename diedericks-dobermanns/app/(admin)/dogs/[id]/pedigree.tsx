import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Collapsible } from '@/components/ui/Collapsible';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useDog } from '@/hooks/useDogs';
import { saveDogPedigree, useSubmitting } from '@/hooks/useMutations';
import type { DogPedigree, PedigreeNode, PedigreeSlot } from '@/types/app.types';

type SlotConfig = { slot: PedigreeSlot; label: string };

const GENERATION_1: SlotConfig[] = [
  { slot: 'sire', label: 'Sire (Father)' },
  { slot: 'dam', label: 'Dam (Mother)' },
];

const GENERATION_2: SlotConfig[] = [
  { slot: 'sireSire', label: "Sire's Sire" },
  { slot: 'sireDam', label: "Sire's Dam" },
  { slot: 'damSire', label: "Dam's Sire" },
  { slot: 'damDam', label: "Dam's Dam" },
];

const GENERATION_3: SlotConfig[] = [
  { slot: 'sireSireSire', label: "Sire's Sire's Sire" },
  { slot: 'sireSireDam', label: "Sire's Sire's Dam" },
  { slot: 'sireDamSire', label: "Sire's Dam's Sire" },
  { slot: 'sireDamDam', label: "Sire's Dam's Dam" },
  { slot: 'damSireSire', label: "Dam's Sire's Sire" },
  { slot: 'damSireDam', label: "Dam's Sire's Dam" },
  { slot: 'damDamSire', label: "Dam's Dam's Sire" },
  { slot: 'damDamDam', label: "Dam's Dam's Dam" },
];

interface NodeFieldsProps {
  label: string;
  node: PedigreeNode;
  showRegistration?: boolean;
  onChange: (next: PedigreeNode) => void;
}

function NodeFields({ label, node, showRegistration, onChange }: NodeFieldsProps) {
  return (
    <View className="mb-4 rounded-2xl border border-gold/15 bg-black-rich p-4">
      <Typography variant="label" className="mb-3">
        {label}
      </Typography>
      <Input
        label="Name"
        placeholder="e.g. Zeus vom Diedericks"
        autoCapitalize="words"
        value={node.name}
        onChangeText={(name) => onChange({ ...node, name })}
      />
      <Input
        label="Titles / awards"
        placeholder="e.g. IGP3, KKL1"
        autoCapitalize="characters"
        value={node.titles ?? ''}
        onChangeText={(titles) => onChange({ ...node, titles })}
        containerClassName={showRegistration ? 'mb-4' : undefined}
      />
      {showRegistration ? (
        <Input
          label="Registration no."
          placeholder="e.g. KUSA DB-2021-0412"
          autoCapitalize="characters"
          value={node.registration ?? ''}
          onChangeText={(registration) => onChange({ ...node, registration })}
          containerClassName=""
        />
      ) : null}
    </View>
  );
}

const ALL_SLOTS: PedigreeSlot[] = [
  ...GENERATION_1,
  ...GENERATION_2,
  ...GENERATION_3,
].map((s) => s.slot);

/** Normalises a stored node into editable fields (never undefined). */
function toFields(node?: PedigreeNode): PedigreeNode {
  return {
    name: node?.name ?? '',
    titles: node?.titles ?? '',
    registration: node?.registration ?? '',
  };
}

/** Builds the saved pedigree, dropping any ancestor slot with no name. */
function clean(resolve: (slot: PedigreeSlot) => PedigreeNode): DogPedigree {
  const out: DogPedigree = {};
  ALL_SLOTS.forEach((slot) => {
    const node = resolve(slot);
    const name = node.name.trim();
    if (!name) return;
    out[slot] = {
      name,
      ...(node.titles?.trim() ? { titles: node.titles.trim() } : {}),
      ...(node.registration?.trim() ? { registration: node.registration.trim() } : {}),
    };
  });
  return out;
}

export default function PedigreeEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { dog, loading, error } = useDog(id);
  const { submitting, run } = useSubmitting();
  // Edits overlay the loaded pedigree so no effect-based seeding is needed.
  const [edits, setEdits] = useState<Partial<Record<PedigreeSlot, PedigreeNode>>>({});

  function update(slot: PedigreeSlot, next: PedigreeNode) {
    setEdits((prev) => ({ ...prev, [slot]: next }));
  }

  async function onSave() {
    if (!id) return;
    const { error } = await run(() => saveDogPedigree(id, clean(node)));
    if (!error) router.back();
  }

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer className="px-6 items-center justify-center">
        <Typography variant="subtitle" className="text-danger">{error}</Typography>
        <Button label="Go back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }

  if (!dog) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center px-6">
        <Typography variant="subtitle">Dog not found.</Typography>
        <Button label="Back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }

  const node = (slot: PedigreeSlot): PedigreeNode =>
    edits[slot] ?? toFields(dog.pedigree?.[slot]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <PageHeader eyebrow="Pedigree" title={dog.name} />
        <View className="px-6">
          <Typography variant="bodyMuted" className="mb-4">
            Record up to three generations of ancestry. Leave a slot blank to mark
            it unknown.
          </Typography>

          <Typography variant="label" className="mb-2 text-silver">
            Parents
          </Typography>
          {GENERATION_1.map(({ slot, label }) => (
            <NodeFields
              key={slot}
              label={label}
              node={node(slot)}
              showRegistration
              onChange={(next) => update(slot, next)}
            />
          ))}

          <Collapsible title="Grandparents" defaultOpen>
            {GENERATION_2.map(({ slot, label }) => (
              <NodeFields
                key={slot}
                label={label}
                node={node(slot)}
                onChange={(next) => update(slot, next)}
              />
            ))}
          </Collapsible>

          <Collapsible title="Great-Grandparents">
            {GENERATION_3.map(({ slot, label }) => (
              <NodeFields
                key={slot}
                label={label}
                node={node(slot)}
                onChange={(next) => update(slot, next)}
              />
            ))}
          </Collapsible>

          <Button
            label="Save Pedigree"
            onPress={onSave}
            loading={submitting}
            fullWidth
            className="mt-6"
          />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
