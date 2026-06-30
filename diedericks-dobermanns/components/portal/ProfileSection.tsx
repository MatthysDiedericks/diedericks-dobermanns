import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';

interface ProfileSectionProps {
  title: string;
  children: ReactNode;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
}

export function ProfileSection({
  title,
  children,
  onSave,
  saving = false,
  saveLabel = 'Save',
}: ProfileSectionProps) {
  return (
    <View className="mb-6">
      <Typography variant="label" className="mb-2 text-gold">
        {title}
      </Typography>
      <Card>
        {children}
        <Button
          label={saveLabel}
          onPress={onSave}
          loading={saving}
          className="mt-4"
          fullWidth
        />
      </Card>
    </View>
  );
}
