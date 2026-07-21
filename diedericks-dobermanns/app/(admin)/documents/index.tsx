import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';

import { DocumentCard } from '@/components/documents/DocumentCard';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { ExpiringDogsPanel } from '@/components/documents/ExpiringDogsPanel';
import {
  UploadDocumentSheet,
  type UploadDocumentSheetHandle,
} from '@/components/documents/UploadDocumentSheet';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAllDocuments } from '@/hooks/useDocuments';
import { callCheckDocumentExpiry } from '@/lib/functions';
import {
  KENNEL_DOCUMENT_ENTITY_ID,
  type DocumentEntityType,
} from '@/lib/documents/constants';
import type { DocumentRecord } from '@/lib/documents/types';
import { titleCase } from '@/lib/format';
import { useAuthStore } from '@/stores/authStore';

const ENTITY_FILTERS: (DocumentEntityType | 'all')[] = [
  'all',
  'dog',
  'litter',
  'client',
  'training',
  'kennel',
];

type SortMode = 'uploaded_desc' | 'uploaded_asc' | 'name_asc' | 'expiry_asc';

export default function KennelDocumentsScreen() {
  const router = useRouter();
  const uploadRef = useRef<UploadDocumentSheetHandle>(null);
  const isAdmin = useAuthStore((s) => s.hasRole('admin', 'super_admin'));

  const [entityFilter, setEntityFilter] = useState<DocumentEntityType | 'all'>('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('uploaded_desc');
  const [viewerDoc, setViewerDoc] = useState<DocumentRecord | null>(null);
  const [expiringCount, setExpiringCount] = useState(0);
  const [checkingExpiry, setCheckingExpiry] = useState(false);

  const filters = useMemo(
    () => ({
      entityType: entityFilter,
      category: category === 'all' ? undefined : category,
      search,
      sort,
    }),
    [entityFilter, category, search, sort],
  );

  const { documents, loading, error, refresh } = useAllDocuments(filters);

  const categories = useMemo(() => {
    const set = new Set(documents.map((d) => d.category));
    return ['all', ...Array.from(set).sort()];
  }, [documents]);

  async function checkExpiryNow() {
    setCheckingExpiry(true);
    try {
      const result = await callCheckDocumentExpiry();
      Alert.alert(
        'Check complete',
        `${result.remindersSent} reminder${result.remindersSent === 1 ? '' : 's'} sent (checked ${result.checked} document${result.checked === 1 ? '' : 's'}).`,
      );
      await refresh();
    } catch (e) {
      Alert.alert('Check failed', e instanceof Error ? e.message : 'Could not run the check.');
    } finally {
      setCheckingExpiry(false);
    }
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Kennel" title="Documents" back={false} />

      <ExpiringDogsPanel
        onDogPress={(dogId) =>
          router.push({ pathname: '/(admin)/dogs/[id]', params: { id: dogId } } as never)
        }
        onCountChange={setExpiringCount}
      />

      <View className="px-6 mb-4">
        <Input value={search} onChangeText={setSearch} placeholder="Search documents or categories…" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 px-6">
        {ENTITY_FILTERS.map((e) => (
          <Pressable
            key={e}
            onPress={() => setEntityFilter(e)}
            className={`mr-2 rounded-full border px-3 py-1.5 ${entityFilter === e ? 'border-gold bg-gold/15' : 'border-gold/30'}`}
          >
            <Typography variant="caption">{e === 'all' ? 'All' : titleCase(e)}</Typography>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-6">
        {(
          [
            { id: 'uploaded_desc' as const, label: 'Date uploaded' },
            { id: 'name_asc' as const, label: 'Name A–Z' },
            { id: 'expiry_asc' as const, label: 'Expiry date' },
          ] as const
        ).map((s) => (
          <Pressable
            key={s.id}
            onPress={() => setSort(s.id)}
            className={`mr-2 rounded-full border px-3 py-1.5 ${sort === s.id ? 'border-gold bg-gold/15' : 'border-gold/30'}`}
          >
            <Typography variant="caption">{s.label}</Typography>
          </Pressable>
        ))}
      </ScrollView>

      {categories.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-6">
          {categories.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              className={`mr-2 rounded-full border px-3 py-1.5 ${category === c ? 'border-gold bg-gold/15' : 'border-gold/30'}`}
            >
              <Typography variant="caption">{c === 'all' ? 'All categories' : c}</Typography>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View className="px-6 mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Button label="+ Upload" size="sm" onPress={() => uploadRef.current?.open()} />
          {isAdmin ? (
            <Button
              label="Check Now"
              size="sm"
              variant="outline"
              loading={checkingExpiry}
              onPress={() => void checkExpiryNow()}
            />
          ) : null}
        </View>
        <Typography variant="caption" className="text-ink-muted">
          {documents.length} document{documents.length === 1 ? '' : 's'}
          {expiringCount > 0 ? ` · ${expiringCount} need attention` : ''}
        </Typography>
      </View>

      <ScrollView className="px-6 pb-12">
        {loading ? (
          <ActivityIndicator color={Colors.gold} className="py-8" />
        ) : null}
        {error ? <Typography variant="body" className="text-danger">{error}</Typography> : null}

        {!loading && documents.length === 0 ? (
          <EmptyState title="No documents" message="Upload kennel files to get started." />
        ) : null}

        {documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            onView={setViewerDoc}
            onEdit={(d) => uploadRef.current?.open(d)}
            onDeleted={refresh}
          />
        ))}
      </ScrollView>

      <UploadDocumentSheet
        ref={uploadRef}
        entityType="kennel"
        entityId={KENNEL_DOCUMENT_ENTITY_ID}
        onSaved={refresh}
      />

      <DocumentViewer document={viewerDoc} visible={!!viewerDoc} onClose={() => setViewerDoc(null)} />
    </ScreenContainer>
  );
}
