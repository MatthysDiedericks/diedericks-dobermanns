import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import {
  buyerJourneyStepLabel,
  type BuyerJourneyStep,
} from '@/lib/portal/buyerJourney';

const STEP_COUNT = 8;

/**
 * Shared buyer journey — portal dashboard and application screen.
 * currentStep is 1-indexed and derived from real data. Always stacked so eight
 * labels never squeeze onto one row on a phone.
 */
export function JourneyBreadcrumb({
  currentStep,
  applicationApproved = false,
  skipWaitingList = false,
}: {
  currentStep: BuyerJourneyStep;
  applicationApproved?: boolean;
  skipWaitingList?: boolean;
}) {
  return (
    <Card className="mt-2">
      <Typography variant="label" className="mb-3 text-gold">
        WHAT HAPPENS NEXT
      </Typography>
      {Array.from({ length: STEP_COUNT }, (_, index) => {
        const step = (index + 1) as BuyerJourneyStep;
        const skipped = step === 6 && skipWaitingList;
        const done = !skipped && step < currentStep;
        const current = !skipped && step === currentStep;
        const label = buyerJourneyStepLabel(step, applicationApproved);
        return (
          <View key={step} className="mb-3 flex-row items-start last:mb-0">
            <View
              className={`mr-3 h-7 w-7 items-center justify-center rounded-full border ${
                skipped
                  ? 'border-border bg-background'
                  : done || current
                    ? 'border-gold bg-gold'
                    : 'border-border bg-background'
              }`}
            >
              <Typography
                variant="caption"
                className={skipped ? 'text-subtle' : done || current ? 'text-black' : 'text-subtle'}
              >
                {skipped ? '—' : done ? '✓' : String(step)}
              </Typography>
            </View>
            <Typography
              variant="caption"
              className={`flex-1 pt-1 ${
                skipped
                  ? 'text-subtle'
                  : current
                    ? 'font-semibold text-gold'
                    : done
                      ? 'text-ink'
                      : 'text-subtle'
              }`}
            >
              {label}
            </Typography>
          </View>
        );
      })}
    </Card>
  );
}
