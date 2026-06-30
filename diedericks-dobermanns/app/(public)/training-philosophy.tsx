import { View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Collapsible } from '@/components/ui/Collapsible';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';

const PILLARS = [
  {
    title: 'Foundation First',
    body: 'Every Diedericks Dobermann begins with neurological stimulation, confident socialisation and clear engagement before any advanced work starts. A stable mind is the foundation of a reliable working dog.',
  },
  {
    title: 'Drive with Control',
    body: 'We develop powerful, genetically-sound drive and channel it through obedience and impulse control. Power without control is a liability — our dogs are switched on and switched off on command.',
  },
  {
    title: 'Protection with Discernment',
    body: 'Protection training is reserved for the right candidates and built on clarity, not aggression. The result is a discerning protector that is safe with family and decisive under genuine threat.',
  },
];

const DISCIPLINES = [
  {
    title: 'Obedience',
    body: 'Precision heeling, reliable recalls, distance control and the manners that make a Dobermann a pleasure to live with.',
  },
  {
    title: 'Protection / IGP',
    body: 'Structured grip development, guarding, and controlled engagement following internationally recognised IGP principles.',
  },
  {
    title: 'PSA',
    body: 'Scenario-based protection sport that proofs the dog against unpredictable environments and realistic pressure.',
  },
  {
    title: 'Socialisation',
    body: 'Deliberate, positive exposure to people, surfaces, sounds and situations so the dog is confident everywhere.',
  },
];

export default function TrainingPhilosophyScreen() {
  return (
    <ScreenContainer>
      <PageHeader eyebrow="Our Method" title="Training Philosophy" />

      <View className="px-6">
        <Typography variant="bodyMuted">
          We breed and develop Dobermanns that are equal parts companion and
          protector. Our programme balances genetics, structure and methodical
          training to produce dogs that are stable, biddable and capable.
        </Typography>
      </View>

      <View className="mt-8 px-6">
        <SectionHeader eyebrow="Principles" title="The Three Pillars" />
        <View className="gap-3">
          {PILLARS.map((p) => (
            <Card key={p.title}>
              <Typography variant="subtitle" className="text-gold">
                {p.title}
              </Typography>
              <Typography variant="bodyMuted" className="mt-2">
                {p.body}
              </Typography>
            </Card>
          ))}
        </View>
      </View>

      <View className="mt-10 px-6">
        <SectionHeader eyebrow="Programme" title="Disciplines" />
        {DISCIPLINES.map((d) => (
          <Collapsible key={d.title} title={d.title}>
            <Typography variant="bodyMuted">{d.body}</Typography>
          </Collapsible>
        ))}
      </View>
    </ScreenContainer>
  );
}
