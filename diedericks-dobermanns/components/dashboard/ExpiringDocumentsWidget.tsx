import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { Typography } from '@/components/ui/Typography';
import { useExpiringDocuments } from '@/hooks/useDocuments';
import { expiryLabel, expiryStatus } from '@/lib/documents/expiry';
import { titleCase } from '@/lib/format';
import { formatKennelDate } from '@/lib/kennel/formatters';

/** "Expiring Documents" dashboard widget — self-contained (fetches its own data) so
 * AdminDashboardContent.tsx stays under the 300-line budget. */
export function ExpiringDocumentsWidget() {
  const router = useRouter();
  const { documents: expiringDocs } = useExpiringDocuments(60, 5);

  return (
    <SurfaceCard title="Expiring Documents" href="/(admin)/documents/index">
      {expiringDocs.length === 0 ? (
        <Typography variant="caption" className="text-subtle">
          No documents expiring in the next 60 days.
        </Typography>
      ) : (
        expiringDocs.map((doc) => {
          const exp = expiryStatus(doc.expiry_date);
          const label = expiryLabel(doc.expiry_date);
          return (
            <Pressable
              key={doc.id}
              onPress={() => router.push('/(admin)/documents/index' as never)}
              className="flex-row items-center border-b border-gold/10 py-3"
            >
              <View className="flex-1">
                <Typography variant="body">{doc.document_name}</Typography>
                <Typography variant="caption" className="text-ink-muted">
                  {titleCase(doc.entity_type)} · {formatKennelDate(doc.expiry_date)}
                </Typography>
              </View>
              {label ? (
                <Typography variant="caption" className={exp === 'expired' ? 'text-danger' : 'text-gold'}>
                  {label}
                </Typography>
              ) : null}
            </Pressable>
          );
        })
      )}
    </SurfaceCard>
  );
}
