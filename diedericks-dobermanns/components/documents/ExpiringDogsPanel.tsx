import { useEffect } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useExpiringDogDocuments } from '@/hooks/useDocuments';
import { formatKennelDate } from '@/lib/kennel/formatters';

interface ExpiringDogsPanelProps {
  onDogPress: (dogId: string) => void;
  onCountChange?: (count: number) => void;
}

function expiryLabel(daysRemaining: number, expiryDate: string, isOverdue: boolean): string {
  if (isOverdue) {
    const abs = Math.abs(daysRemaining);
    return `Expired ${abs} day${abs === 1 ? '' : 's'} ago`;
  }
  return `Expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} — ${formatKennelDate(expiryDate)}`;
}

function rowTone(item: { isOverdue: boolean; daysRemaining: number }) {
  if (item.isOverdue) return { dot: 'bg-danger', text: 'text-danger', bg: 'bg-danger/10 border-danger/30' };
  if (item.daysRemaining < 30) return { dot: 'bg-gold', text: 'text-gold', bg: 'bg-gold/10 border-gold/30' };
  return { dot: 'bg-silver', text: 'text-ink', bg: 'border-gold/15' };
}

export function ExpiringDogsPanel({ onDogPress, onCountChange }: ExpiringDogsPanelProps) {
  const { items, loading } = useExpiringDogDocuments(90);

  useEffect(() => {
    const urgent = items.filter((i) => i.isOverdue || i.daysRemaining < 30).length;
    onCountChange?.(urgent);
  }, [items, onCountChange]);

  if (!loading && items.length === 0) return null;

  const overdue = items.filter((i) => i.isOverdue);
  const upcoming = items.filter((i) => !i.isOverdue);

  return (
    <Card className="mx-6 mb-4 border border-gold/30 bg-black-rich">
      <Typography variant="label" className="mb-1 text-gold">
        ⚠ NEEDS ATTENTION
      </Typography>
      <Typography variant="caption" className="mb-3 text-subtle">
        Documents expiring within 90 days
      </Typography>

      {loading ? <ActivityIndicator color={Colors.gold} className="py-4" /> : null}

      {overdue.length > 0 ? (
        <Typography variant="caption" className="mb-2 text-danger">
          OVERDUE
        </Typography>
      ) : null}

      {[...overdue, ...upcoming].map((item) => {
        const tone = rowTone(item);
        return (
          <View key={item.documentId} className={`mb-2 rounded-xl border p-3 ${tone.bg}`}>
            <View className="mb-1 flex-row items-center gap-2">
              <View className={`h-2 w-2 rounded-full ${tone.dot}`} />
              <Typography variant="body" className={`flex-1 ${tone.text}`} numberOfLines={1}>
                {item.dogName} · {item.category}
              </Typography>
            </View>
            <Typography variant="caption" className={`mb-2 ${tone.text}`}>
              {expiryLabel(item.daysRemaining, item.expiryDate, item.isOverdue)}
            </Typography>
            <Pressable onPress={() => onDogPress(item.dogId)}>
              <Typography variant="label" className="text-gold">
                View Dog →
              </Typography>
            </Pressable>
          </View>
        );
      })}
    </Card>
  );
}
