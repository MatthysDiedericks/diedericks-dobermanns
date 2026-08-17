import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';
import {
  ELITE_DEVELOPED_FOOTER,
  ELITE_DEVELOPED_HANDOVER,
  ELITE_DEVELOPED_INTRO,
  ELITE_DEVELOPED_PACE,
  ELITE_DEVELOPED_SECTIONS,
  ELITE_DEVELOPED_SIX_MONTHS,
  type EliteSection,
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

function SectionCard({ section }: { section: EliteSection }) {
  return (
    <Card>
      {section.eyebrow ? <Typography variant="label">{section.eyebrow}</Typography> : null}
      <Typography variant="subtitle" className={section.eyebrow ? 'mt-2 text-gold' : 'text-gold'}>
        {section.title}
      </Typography>
      <View className="mt-3 gap-3">
        {section.lead.map((p) => (
          <RichText key={p} text={p} />
        ))}
      </View>
      {section.bullets ? (
        <View className="mt-3 gap-2">
          {section.bullets.map((item) => (
            <Typography key={item} variant="bodyMuted">
              • {item}
            </Typography>
          ))}
        </View>
      ) : null}
      {section.after ? (
        <View className="mt-3 gap-3">
          {section.after.map((p) => (
            <RichText key={p} text={p} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

export function EliteDevelopedBody() {
  return (
    <View className="gap-10 px-6 pb-8">
      <View className="gap-4">
        {ELITE_DEVELOPED_INTRO.map((p) => (
          <RichText key={p} text={p} />
        ))}
      </View>

      <View className="rounded-2xl border border-gold/40 bg-black-rich p-5">
        <SectionHeader title={ELITE_DEVELOPED_PACE.title} />
        <View className="gap-4">
          {ELITE_DEVELOPED_PACE.paragraphs.map((p) => (
            <RichText key={p} text={p} />
          ))}
        </View>
      </View>

      <View className="gap-4">
        {ELITE_DEVELOPED_SECTIONS.map((section) => (
          <SectionCard key={section.title} section={section} />
        ))}
      </View>

      <View className="rounded-2xl border border-gold/40 bg-black-rich p-5">
        <SectionHeader title={ELITE_DEVELOPED_SIX_MONTHS.title} />
        <RichText text={ELITE_DEVELOPED_SIX_MONTHS.lead} />
        <View className="mt-3 gap-3">
          {ELITE_DEVELOPED_SIX_MONTHS.paragraphs.map((p) => (
            <RichText key={p} text={p} />
          ))}
        </View>
      </View>

      <View>
        <SectionHeader title={ELITE_DEVELOPED_HANDOVER.title} />
        <View className="gap-4">
          {ELITE_DEVELOPED_HANDOVER.paragraphs.map((p) => (
            <RichText key={p} text={p} />
          ))}
        </View>
        <Typography variant="caption" className="mt-8 text-center italic">
          {ELITE_DEVELOPED_FOOTER}
        </Typography>
      </View>
    </View>
  );
}
