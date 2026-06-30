import { View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useTestimonials } from '@/hooks/useContent';

export default function TestimonialsScreen() {
  const { data: testimonials, loading } = useTestimonials();

  return (
    <ScreenContainer>
      <PageHeader eyebrow="In Their Words" title="Testimonials" />
      <View className="gap-4 px-6">
        {!loading && testimonials.length === 0 ? (
          <EmptyState title="No testimonials yet" />
        ) : (
          testimonials.map((t) => (
            <Card key={t.id}>
              <Typography variant="body" className="italic">
                “{t.content}”
              </Typography>
              <Typography variant="label" className="mt-4">
                {t.client_name}
                {t.location ? ` · ${t.location}` : ''}
              </Typography>
              {t.dog_name ? (
                <Typography variant="caption" className="mt-1">
                  Owner of {t.dog_name}
                </Typography>
              ) : null}
            </Card>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
