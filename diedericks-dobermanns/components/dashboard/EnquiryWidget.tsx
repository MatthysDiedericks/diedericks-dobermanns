import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { timeAgo } from '@/lib/kennel/formatters';

type Enquiry = {
  id: string;
  full_name: string;
  subject?: string | null;
  created_at: string;
  email?: string | null;
  phone?: string | null;
};

export function EnquiryWidget({ enquiries }: { enquiries: Enquiry[] }) {
  const router = useRouter();

  return (
    <SurfaceCard title="Customer Enquiries" badge={enquiries.length} badgeTone="gold">
      {enquiries.length === 0 ? (
        <Typography variant="caption" className="text-subtle">No new enquiries.</Typography>
      ) : (
        enquiries.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => router.push(`/(tabs)/contacts/enquiries/${e.id}` as never)}
            className="flex-row items-center border-b border-gold/10 py-3"
          >
            <View className="flex-1">
              <Typography variant="body">{e.full_name}</Typography>
              <Typography variant="caption" className="text-subtle">
                {e.email ?? e.phone ?? e.subject ?? 'Enquiry'}
              </Typography>
              <Typography variant="caption">{timeAgo(e.created_at)}</Typography>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.silver} />
          </Pressable>
        ))
      )}
    </SurfaceCard>
  );
}
