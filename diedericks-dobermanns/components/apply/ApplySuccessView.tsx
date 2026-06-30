import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';

interface Props {
  reference: string;
}

export function ApplySuccessView({ reference }: Props) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(5);

  const goHome = useCallback(() => {
    router.replace('/');
  }, [router]);

  useEffect(() => {
    const countdown = setInterval(() => {
      setSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    const timer = setTimeout(goHome, 5000);
    return () => {
      clearInterval(countdown);
      clearTimeout(timer);
    };
  }, [goHome]);

  return (
    <ScreenContainer scroll={false} className="items-center justify-center px-8">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-success/15">
        <Ionicons name="checkmark" size={32} color={Colors.success} />
      </View>
      <Typography variant="display" className="mt-6 text-center">
        Application Received
      </Typography>
      <Typography variant="bodyMuted" className="mt-3 text-center">
        Thank you. Our team will review your application and be in touch.
      </Typography>
      <View className="mt-4 rounded-xl border border-gold/30 bg-black-rich px-5 py-3">
        <Typography variant="caption">Your reference</Typography>
        <Typography variant="title" className="mt-1 text-gold">
          {reference}
        </Typography>
      </View>
      <Button label="Back to Home" onPress={goHome} className="mt-8" />
      <Typography variant="caption" className="mt-4 text-subtle">
        Returning to home in {seconds}s…
      </Typography>
    </ScreenContainer>
  );
}
