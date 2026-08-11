import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Collapsible } from '@/components/ui/Collapsible';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { saveDogPedigree, useSubmitting } from '@/hooks/useMutations';
import type { Dog, DogPedigree, PedigreeNode, PedigreeSlot } from '@/types/app.types';

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

const ALL_SLOTS: PedigreeSlot[] = [
  ...GENERATION_1,
  ...GENERATION_2,
  ...GENERATION_3,
].map((s) => s.slot);

function toFields(node?: PedigreeNode): PedigreeNode {
  return {
    name: node?.name ?? '',
    titles: node?.titles ?? '',
    registration: node?.registration ?? '',
  };
}

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

function NodeFields({
  label,
  node,
  showRegistration,
  onChange,
}: {
  label: string;
  node: PedigreeNode;
  showRegistration?: boolean;
  onChange: (next: PedigreeNode) => void;
}) {
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

interface PedigreeEditorFormProps {
  dogId: string;
  dog: Dog;
  onSaved?: () => void;
}

export function PedigreeEditorForm({ dogId, dog, onSaved }: PedigreeEditorFormProps) {
  const { submitting, run } = useSubmitting();
  const [edits, setEdits] = useState<Partial<Record<PedigreeSlot, PedigreeNode>>>({});

  function update(slot: PedigreeSlot, next: PedigreeNode) {
    setEdits((prev) => ({ ...prev, [slot]: next }));
  }

  const node = (slot: PedigreeSlot): PedigreeNode =>
    edits[slot] ?? toFields(dog.pedigree?.[slot]);

  async function onSave() {
    const { error } = await run(() => saveDogPedigree(dogId, clean(node)));
    if (!error) onSaved?.();
  }

  return (
    <View>
      <Typography variant="bodyMuted" className="mb-4">
        Record up to three generations of ancestry. Leave a slot blank to mark it unknown.
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
  );
}
