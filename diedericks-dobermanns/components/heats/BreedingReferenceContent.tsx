import { View } from 'react-native';

import { SectionCard } from '@/components/dogs/detail/SectionCard';
import { DetailRow } from '@/components/dogs/detail/DetailRow';
import { Typography } from '@/components/ui/Typography';
import { progesteroneColor } from '@/lib/heats/calculations';

function ProgRow({
  color,
  range,
  meaning,
  action,
}: {
  color: string;
  range: string;
  meaning: string;
  action: string;
}) {
  return (
    <View className="mb-2 flex-row overflow-hidden rounded-lg border border-gold/10 bg-black-rich">
      <View style={{ width: 4, backgroundColor: color }} />
      <View className="flex-1 p-3">
        <Typography variant="body">{range}</Typography>
        <Typography variant="caption" className="text-muted">
          {meaning}
        </Typography>
        <Typography variant="caption" className="mt-1 text-gold">
          {action}
        </Typography>
      </View>
    </View>
  );
}

export function BreedingReferenceContent() {
  return (
    <View className="pb-12">
      <SectionCard title="Heat cycle predictions">
        <DetailRow label="First heat recorded" value="Dobermann breed average — 180 days" />
        <DetailRow label="2+ heats recorded" value="That female's personal average" />
        <Typography variant="caption" className="mt-2 text-muted">
          Predictions update automatically each time you confirm a real heat. The more cycles
          recorded, the more accurate the forecast.
        </Typography>
      </SectionCard>

      <SectionCard title="Dobermann heat phases">
        <DetailRow label="Proestrus (~9 days)" value="Swelling, bloody discharge — won't accept mating" />
        <DetailRow label="Estrus (~7 days)" value="Discharge lightens — fertile window" />
        <DetailRow label="Diestrus (~75 days)" value="Body prepares for pregnancy or false pregnancy" />
        <DetailRow label="Anestrus (~89 days)" value="Rest period — no hormonal activity" />
      </SectionCard>

      <SectionCard title="Progesterone guide">
        <ProgRow color={progesteroneColor(1)} range="< 2 ng/mL" meaning="Baseline — no ovulation yet" action="Too early to breed" />
        <ProgRow color={progesteroneColor(3)} range="2 – 5 ng/mL" meaning="Approaching ovulation (LH surge)" action="Test every 1–2 days" />
        <ProgRow color={progesteroneColor(8)} range="5 – 15 ng/mL" meaning="Ovulation occurred" action="Breed now" />
        <ProgRow color={progesteroneColor(20)} range="> 15 ng/mL" meaning="Peak — optimal breeding window" action="Best time to breed" />
        <Typography variant="caption" className="mt-2 text-muted">
          Best practice: start testing from Day 5 of heat. Test every 2 days until value rises above 5.
        </Typography>
      </SectionCard>

      <SectionCard title="Optimal breeding window">
        <DetailRow label="Natural" value="Ovulation day + 2 to + 4 days" />
        <DetailRow label="AI (fresh/chilled)" value="Ovulation day to + 2 days" />
        <DetailRow label="AI (frozen)" value="Ovulation day + 1 to + 3 days" />
      </SectionCard>

      <SectionCard title="Whelping dates">
        <Typography variant="caption" className="mb-2 text-muted">
          From mating date (less accurate)
        </Typography>
        <DetailRow label="Earliest whelp" value="Mating + 57 days" />
        <DetailRow label="Expected whelp" value="Mating + 60 days" />
        <DetailRow label="Latest whelp" value="Mating + 65 days" />
        <Typography variant="caption" className="mb-2 mt-3 text-muted">
          From ovulation date (more accurate)
        </Typography>
        <DetailRow label="Earliest whelp" value="Ovulation + 60 days" />
        <DetailRow label="Expected whelp" value="Ovulation + 63 days" />
        <DetailRow label="Latest whelp" value="Ovulation + 66 days" />
        <View className="mt-3 rounded-lg border border-gold/30 bg-gold/5 p-3">
          <Typography variant="caption" className="text-gold">
            Always use ovulation date when available — significantly more accurate than mating date
            alone.
          </Typography>
        </View>
      </SectionCard>

      <SectionCard title="Puppy go-home dates">
        <DetailRow label="Earliest go-home" value="Birth date + 8 weeks (56 days)" />
        <DetailRow label="Standard go-home" value="Birth date + 9 weeks (63 days)" />
        <DetailRow label="Latest go-home" value="Birth date + 10 weeks (70 days)" />
        <Typography variant="caption" className="mt-2 text-muted">
          Before actual birth, the app shows estimated go-home dates from expected whelp. Once you
          record the real birth date, go-home dates recalculate automatically.
        </Typography>
      </SectionCard>

      <SectionCard title="What updates automatically">
        <DetailRow label="Heat start date" value="Proestrus, estrus, ovulation, next prediction" />
        <DetailRow label="Mating date" value="Whelp date range, estimated go-home range" />
        <DetailRow label="Ovulation date" value="More accurate whelp & go-home ranges" />
        <DetailRow label="Actual birth date" value="Exact go-home range (replaces estimates)" />
        <DetailRow label="2nd confirmed heat" value="Personal cycle average for predictions" />
      </SectionCard>

      <SectionCard title="Heat status indicators">
        <DetailRow label="Red dot — In Heat Day X" value="Currently in active heat" />
        <DetailRow label="Gold — Next heat" value="Predicted upcoming heat" />
        <DetailRow label="Orange — Overdue" value="Predicted date passed, not confirmed" />
        <DetailRow label="Grey — No history" value="No heats recorded yet" />
      </SectionCard>
    </View>
  );
}
