import { View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Collapsible } from '@/components/ui/Collapsible';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useFaq } from '@/hooks/useContent';

export default function FaqScreen() {
  const { data: faqs, loading } = useFaq();

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Answers" title="FAQ" />
      <View className="px-6">
        {!loading && faqs.length === 0 ? (
          <EmptyState title="No questions published yet" />
        ) : (
          faqs.map((item) => (
            <Collapsible key={item.id} title={item.question}>
              <Typography variant="bodyMuted">{item.answer}</Typography>
            </Collapsible>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
