import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';

import { AuditLogItem } from '@/components/admin/AuditLogItem';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAuditLog } from '@/hooks/useAuditLog';
import { AUDIT_ACTIONS, AUDIT_TABLES, humanize } from '@/lib/audit/labels';

export default function AuditLogScreen() {
  const params = useLocalSearchParams<{ table?: string; record?: string }>();
  const recordFilter = typeof params.record === 'string' ? params.record : undefined;
  const tableFromParams = typeof params.table === 'string' ? params.table : undefined;

  const [table, setTable] = useState<string | undefined>(tableFromParams);
  const [action, setAction] = useState<string | undefined>();

  const filters = useMemo(
    () => ({
      table: recordFilter ? tableFromParams ?? table : table,
      action,
      record: recordFilter,
    }),
    [table, action, recordFilter, tableFromParams],
  );

  const { entries, loading, loadingMore, error, hasMore, refresh, loadMore } =
    useAuditLog(filters);

  const dogScoped = Boolean(recordFilter && (tableFromParams === 'dogs' || table === 'dogs'));

  return (
    <ScreenContainer scroll={false}>
      <View className="px-6">
        <PageHeader
          eyebrow="Admin"
          title={dogScoped ? 'Dog history' : 'Audit log'}
        />
        <SectionHeader
          eyebrow="Read-only"
          title={dogScoped ? 'Changes to this dog' : 'Business data changes'}
        />
      </View>

      {!recordFilter ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-2 max-h-12 px-4"
            contentContainerStyle={{ gap: 8 }}
          >
            <Chip
              label="All tables"
              active={!table}
              onPress={() => setTable(undefined)}
            />
            {AUDIT_TABLES.map((t) => (
              <Chip
                key={t}
                label={humanize(t)}
                active={table === t}
                onPress={() => setTable(t)}
              />
            ))}
          </ScrollView>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4 max-h-12 px-4"
            contentContainerStyle={{ gap: 8 }}
          >
            <Chip
              label="All actions"
              active={!action}
              onPress={() => setAction(undefined)}
            />
            {AUDIT_ACTIONS.map((a) => (
              <Chip
                key={a}
                label={humanize(a)}
                active={action === a}
                onPress={() => setAction(a)}
              />
            ))}
          </ScrollView>
        </>
      ) : (
        <View className="mb-4 px-6">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <Chip
              label="All actions"
              active={!action}
              onPress={() => setAction(undefined)}
            />
            {AUDIT_ACTIONS.map((a) => (
              <Chip
                key={a}
                label={humanize(a)}
                active={action === a}
                onPress={() => setAction(a)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {error ? (
        <Typography variant="body" className="px-6 text-danger">
          {error}
        </Typography>
      ) : null}

      {loading && entries.length === 0 ? (
        <View className="px-6">
          <CardListSkeleton count={5} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void refresh()}
              tintColor={Colors.gold}
            />
          }
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <EmptyState
              title="Nothing recorded yet"
              message="Auditing started 11 August 2026"
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={Colors.gold} className="my-4" />
            ) : hasMore ? null : entries.length > 0 ? (
              <Typography variant="caption" className="my-4 text-center text-subtle">
                End of log
              </Typography>
            ) : null
          }
          renderItem={({ item }) => <AuditLogItem entry={item} />}
        />
      )}
    </ScreenContainer>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-4 py-2 ${
        active ? 'border-gold bg-gold/15' : 'border-gold/25'
      }`}
    >
      <Typography variant="caption">{label}</Typography>
    </Pressable>
  );
}
