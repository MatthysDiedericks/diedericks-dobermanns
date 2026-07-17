import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { ExpectedLittersSection } from '@/components/portal/ExpectedLittersSection';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';

export default function ExpectedLittersScreen() {
  return (
    <ScreenContainer>
      <PageHeader eyebrow="Client Portal" title="Expected Litters" />
      <View className="px-6 pb-10">
        <ExpectedLittersSection />
        <Link href="/(portal)/dashboard" asChild>
          <Pressable className="mt-4">
            <Typography variant="caption" className="text-gold">
              ← Back to home
            </Typography>
          </Pressable>
        </Link>
      </View>
    </ScreenContainer>
  );
}
