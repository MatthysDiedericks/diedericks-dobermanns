import { Pressable, View } from 'react-native';

import { CollarPickerField } from '@/components/litters/CollarPicker';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { DOG_COLOUR_OPTIONS, type DogColourCode } from '@/lib/colours/dogColours';
import { type CollarColourId } from '@/lib/litters/collarColours';
import { PUPPY_OUTCOMES, type PuppyOutcome } from '@/lib/litters/outcomes';

export function LitterPuppyAddRow({
  nextOrder,
  sex,
  setSex,
  collar,
  setCollar,
  colour,
  setColour,
  birthGrams,
  setBirthGrams,
  birthTime,
  setBirthTime,
  outcome,
  setOutcome,
  outcomeDate,
  setOutcomeDate,
  outcomeNote,
  setOutcomeNote,
  usedCollars,
  onAdd,
  pending,
}: {
  nextOrder: number;
  sex: 'male' | 'female';
  setSex: (s: 'male' | 'female') => void;
  collar: CollarColourId | null;
  setCollar: (c: CollarColourId | null) => void;
  colour: DogColourCode | '';
  setColour: (c: DogColourCode | '') => void;
  birthGrams: string;
  setBirthGrams: (v: string) => void;
  birthTime: string;
  setBirthTime: (v: string) => void;
  outcome: PuppyOutcome;
  setOutcome: (o: PuppyOutcome) => void;
  outcomeDate: string;
  setOutcomeDate: (d: string) => void;
  outcomeNote: string;
  setOutcomeNote: (n: string) => void;
  usedCollars: string[];
  onAdd: () => void;
  pending: boolean;
}) {
  const duplicateCollar = collar != null && collar !== 'none' && usedCollars.includes(collar);

  return (
    <View className="mb-4 rounded-xl border border-dashed border-gold/30 p-4">
      <Typography variant="caption" className="mb-3 text-gold">
        Add puppy · Next # {nextOrder}
      </Typography>
      <View className="flex-row flex-wrap gap-2">
        <View className="min-w-[140px] flex-1">
          <Typography variant="caption" className="mb-2 text-subtle">
            Sex
          </Typography>
          <View className="mb-3 flex-row gap-2">
            {(['male', 'female'] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => setSex(s)}
                className={`flex-1 rounded-xl border py-3 ${
                  sex === s ? 'border-gold bg-gold/15' : 'border-gold/25'
                }`}
              >
                <Typography variant="caption" className="text-center">
                  {s === 'male' ? '♂ Male' : '♀ Female'}
                </Typography>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <Typography variant="caption" className="mb-2 text-subtle">
        Collar colour
      </Typography>
      <CollarPickerField
        value={collar}
        onChange={setCollar}
        usedColours={usedCollars}
        duplicateWarning={duplicateCollar}
      />
      <Typography variant="caption" className="mb-2 mt-3 text-subtle">
        Colour
      </Typography>
      <View className="mb-3 flex-row gap-2">
        <Pressable
          onPress={() => setColour('')}
          className={`flex-1 rounded-xl border py-3 ${
            colour === '' ? 'border-gold bg-gold/15' : 'border-gold/25'
          }`}
        >
          <Typography variant="caption" className="text-center">
            —
          </Typography>
        </Pressable>
        {DOG_COLOUR_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => setColour(opt.value)}
            className={`flex-1 rounded-xl border py-3 ${
              colour === opt.value ? 'border-gold bg-gold/15' : 'border-gold/25'
            }`}
          >
            <Typography variant="caption" className="text-center">
              {opt.label}
            </Typography>
          </Pressable>
        ))}
      </View>
      <View className="flex-row flex-wrap gap-3">
        <View className="min-w-[140px] flex-1">
          <Input
            label="Birth weight (grams)"
            value={birthGrams}
            onChangeText={setBirthGrams}
            keyboardType="number-pad"
            placeholder="450"
            containerClassName="mb-3"
          />
        </View>
        <View className="min-w-[140px] flex-1">
          <Input
            label="Time of birth"
            value={birthTime}
            onChangeText={setBirthTime}
            placeholder="06:30"
            containerClassName="mb-3"
          />
        </View>
      </View>
      <Typography variant="caption" className="mb-2 text-subtle">
        Outcome
      </Typography>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {PUPPY_OUTCOMES.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => setOutcome(o.value)}
            className={`rounded-xl border px-3 py-3 ${
              outcome === o.value ? 'border-gold bg-gold/15' : 'border-gold/25'
            }`}
          >
            <Typography variant="caption" className="text-center">
              {o.label}
            </Typography>
          </Pressable>
        ))}
      </View>
      {outcome !== 'live' ? (
        <View className="flex-row flex-wrap gap-3">
          <View className="min-w-[140px] flex-1">
            <Input
              label={outcome === 'stillborn' ? 'Date (optional)' : 'Date died'}
              value={outcomeDate}
              onChangeText={setOutcomeDate}
              placeholder="YYYY-MM-DD"
              containerClassName="mb-3"
            />
          </View>
          <View className="min-w-[140px] flex-1">
            <Input
              label="Note"
              value={outcomeNote}
              onChangeText={setOutcomeNote}
              placeholder="Optional"
              containerClassName="mb-3"
            />
          </View>
        </View>
      ) : null}
      <Button
        label="Add puppy"
        onPress={onAdd}
        loading={pending}
        disabled={duplicateCollar}
        fullWidth
      />
    </View>
  );
}
