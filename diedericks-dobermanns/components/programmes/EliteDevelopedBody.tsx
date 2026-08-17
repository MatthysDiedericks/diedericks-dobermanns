import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';
import {
  ELITE_DEVELOPED_CONTINUING,
  ELITE_DEVELOPED_FOOTER,
  ELITE_DEVELOPED_HANDOVER,
  ELITE_DEVELOPED_HONESTY,
  ELITE_DEVELOPED_HOW,
  ELITE_DEVELOPED_INTRO,
  ELITE_DEVELOPED_STRANDS,
  type EliteStrand,
} from '@/lib/content/eliteDeveloped';

function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <Typography variant="bodyMuted">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} className="font-body-semibold text-ink">
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <Text key={i} className="italic">
              {part.slice(1, -1)}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Typography>
  );
}

function StrandCard({ strand }: { strand: EliteStrand }) {
  return (
    <Card>
      <Typography variant="label">
        {strand.number} · {strand.when}
      </Typography>
      <Typography variant="subtitle" className="mt-2 text-gold">
        {strand.title}
      </Typography>
      <View className="mt-3 gap-3">
        {strand.lead.map((p) => (
          <RichText key={p} text={p} />
        ))}
      </View>
      <View className="mt-3 gap-2">
        {strand.bullets.map((item) => (
          <Typography key={item} variant="bodyMuted">
            • {item}
          </Typography>
        ))}
      </View>
      {strand.note ? (
        <View className="mt-3">
          <RichText text={strand.note} />
        </View>
      ) : null}
      <View className="mt-3">
        <RichText text={`**Why it matters:** ${strand.why}`} />
      </View>
    </Card>
  );
}

export function EliteDevelopedBody() {
  return (
    <View className="gap-10 px-6 pb-8">
      <View className="gap-4">
        {ELITE_DEVELOPED_INTRO.map((p) => (
          <Typography key={p} variant="bodyMuted">
            {p}
          </Typography>
        ))}
      </View>

      <View>
        <SectionHeader eyebrow="The Work" title={ELITE_DEVELOPED_HOW.title} />
        <View className="gap-4">
          {ELITE_DEVELOPED_HOW.paragraphs.map((p) => (
            <RichText key={p} text={p} />
          ))}
        </View>
      </View>

      <View className="gap-4">
        {ELITE_DEVELOPED_STRANDS.map((strand) => (
          <StrandCard key={strand.number} strand={strand} />
        ))}
      </View>

      <View>
        <SectionHeader eyebrow="Honesty" title={ELITE_DEVELOPED_HONESTY.willBeTitle} />
        <Typography variant="bodyMuted">{ELITE_DEVELOPED_HONESTY.willBe}</Typography>
      </View>

      <View className="rounded-2xl border border-gold/40 bg-black-rich p-5">
        <SectionHeader eyebrow="Honesty" title={ELITE_DEVELOPED_HONESTY.willNotTitle} />
        <Typography variant="subtitle" className="text-gold">
          {ELITE_DEVELOPED_HONESTY.willNotHeadline}
        </Typography>
        <View className="mt-3 gap-3">
          {ELITE_DEVELOPED_HONESTY.willNot.map((p) => (
            <RichText key={p} text={p} />
          ))}
        </View>
      </View>

      <View>
        <SectionHeader eyebrow="Handover" title={ELITE_DEVELOPED_HANDOVER.title} />
        <Typography variant="bodyMuted">{ELITE_DEVELOPED_HANDOVER.intro}</Typography>
        <View className="mt-3 gap-2">
          {ELITE_DEVELOPED_HANDOVER.bullets.map((item) => (
            <Typography key={item} variant="bodyMuted">
              • {item}
            </Typography>
          ))}
        </View>
        <Typography variant="bodyMuted" className="mt-3">
          {ELITE_DEVELOPED_HANDOVER.close}
        </Typography>
      </View>

      <View>
        <SectionHeader eyebrow="After" title={ELITE_DEVELOPED_CONTINUING.title} />
        <Typography variant="bodyMuted">{ELITE_DEVELOPED_CONTINUING.body}</Typography>
        <Typography variant="caption" className="mt-8 text-center italic">
          {ELITE_DEVELOPED_FOOTER}
        </Typography>
      </View>
    </View>
  );
}
