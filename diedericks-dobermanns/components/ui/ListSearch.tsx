import { View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { looksLikePhoneQuery } from '@/lib/search/match';

export function noMatchLine(entity: string, query: string): string {
  return `No ${entity} matches '${query}'`;
}

export function ListSearch({
  value,
  onChangeText,
  placeholder,
  shown,
  total,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  shown: number;
  total: number;
}) {
  return (
    <View>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoFocus={false}
        keyboardType={looksLikePhoneQuery(value) ? 'phone-pad' : 'default'}
        containerClassName="mb-1"
      />
      <Typography variant="caption" className="text-subtle">
        {shown} of {total}
      </Typography>
    </View>
  );
}
