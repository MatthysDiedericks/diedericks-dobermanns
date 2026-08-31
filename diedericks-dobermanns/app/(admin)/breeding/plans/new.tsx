import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { createBreedingPlan } from '@/lib/breeding/planMutations';
import { showError } from '@/lib/dogDetail/feedback';

export default function NewBreedingPlanScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim() || !objective.trim()) {
      showError('Give the plan a name and one sentence for what this line is for.');
      return;
    }
    setSaving(true);
    try {
      const id = await createBreedingPlan({ name, objective });
      router.replace(`/(admin)/breeding/plans/${id}` as never);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not save the plan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer>
      <PageHeader title="New plan" eyebrow="Breeding" />
      <View className="px-6">
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Line A — Dharka succession"
        />
        <Input
          label="What this line is for"
          value={objective}
          onChangeText={setObjective}
          placeholder="One plain sentence."
          multiline
        />
        <Typography variant="caption" className="mb-4 text-subtle">
          Write it so someone new to the kennel can read it aloud and understand.
        </Typography>
        <Button label="Create plan" loading={saving} onPress={() => void save()} />
      </View>
    </ScreenContainer>
  );
}
