import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { ContactLinkRow } from '@/lib/contacts/links';

export function ContactLinkedSection({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: ContactLinkRow[];
  empty: string;
}) {
  const router = useRouter();

  return (
    <View className="mt-6">
      <Typography variant="label" className="mb-2 text-gold">
        {title}
      </Typography>
      {rows.length === 0 ? (
        <Typography variant="caption" className="text-subtle">
          {empty}
        </Typography>
      ) : (
        rows.map((row) => (
          <Pressable
            key={row.id}
            onPress={() => router.push(row.href as never)}
            className="border-b border-gold/10 py-3"
          >
            <Typography variant="body" className="text-gold">
              {row.label}
            </Typography>
            {row.meta ? (
              <Typography variant="caption" className="text-subtle">
                {row.meta}
              </Typography>
            ) : null}
          </Pressable>
        ))
      )}
    </View>
  );
}
