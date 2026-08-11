import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { BUYER_JOURNEY_STEPS, type BuyerJourneyStep } from '@/lib/portal/buyerJourney';

/**
 * Shared buyer journey — portal dashboard and application screen.
 * currentStep is 1-indexed and derived from real data.
 */
export function JourneyBreadcrumb({ currentStep }: { currentStep: BuyerJourneyStep }) {
  return (
    <Card className="mt-2">
      <Typography variant="label" className="mb-3 text-gold">
        WHAT HAPPENS NEXT
      </Typography>
      {BUYER_JOURNEY_STEPS.map((label, index) => {
        const step = (index + 1) as BuyerJourneyStep;
        const done = step < currentStep;
        const current = step === currentStep;
        return (
          <View key={label} className="mb-3 flex-row items-start last:mb-0">
            <View
              className={`mr-3 h-7 w-7 items-center justify-center rounded-full border ${
                done || current ? 'border-gold bg-gold' : 'border-border bg-background'
              }`}
            >
              <Typography
                variant="caption"
                className={done || current ? 'text-black' : 'text-subtle'}
              >
                {done ? '✓' : String(step)}
              </Typography>
            </View>
            <Typography
              variant="caption"
              className={`flex-1 pt-1 ${current ? 'font-semibold text-gold' : done ? 'text-ink' : 'text-subtle'}`}
            >
              {label}
            </Typography>
          </View>
        );
      })}
    </Card>
  );
}
