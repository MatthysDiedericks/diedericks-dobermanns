import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import {
  TERMS_DEFINITIONS,
  TERMS_IMPORTANT,
  TERMS_LEGAL_NOTE,
  TERMS_SECTIONS,
  TERMS_VERSION,
  TERMS_EFFECTIVE_DATE,
} from '@/lib/legal';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Typography variant="subtitle" className="mb-2 text-gold">
        {title}
      </Typography>
      {children}
    </View>
  );
}

export function TermsOfSaleContent() {
  return (
    <>
      <Typography variant="bodyMuted" className="mb-2 text-sm">
        Version {TERMS_VERSION} · Effective {TERMS_EFFECTIVE_DATE} · Diedericks Dobermanns
      </Typography>
      <Typography variant="body" className="mb-6">
        {TERMS_IMPORTANT}
      </Typography>

      <Section title="1. Definitions">
        {TERMS_DEFINITIONS.map((d) => (
          <Typography key={d.term} variant="body" className="mb-2">
            {d.term} — {d.meaning}
          </Typography>
        ))}
      </Section>

      {TERMS_SECTIONS.map((section) => (
        <Section key={section.number} title={`${section.number}. ${section.title}`}>
          {section.blocks.map((block, i) => (
            <View key={i} className="mb-2">
              {block.text ? <Typography variant="body">{block.text}</Typography> : null}
              {block.bullets?.map((b) => (
                <Typography key={b} variant="body" className="ml-2">
                  • {b}
                </Typography>
              ))}
            </View>
          ))}
        </Section>
      ))}

      <Typography variant="caption" className="mt-4 text-silver">
        {TERMS_LEGAL_NOTE}
      </Typography>
    </>
  );
}
