import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import { DocumentCard } from '@/components/documents/DocumentCard';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import {
  UploadDocumentSheet,
  type UploadDocumentSheetHandle,
} from '@/components/documents/UploadDocumentSheet';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAllDocuments } from '@/hooks/useDocuments';
import { KENNEL_DOCUMENT_ENTITY_ID } from '@/lib/documents/constants';
import type { DocumentRecord } from '@/lib/documents/types';
import { isAdminPlus } from '@/lib/auth/routes';
import { useAuthStore } from '@/stores/authStore';

export default function DocumentsScreen() {
  const role = useAuthStore((s) => s.profile?.role);
  const [search, setSearch] = useState('');
  const uploadRef = useRef<UploadDocumentSheetHandle>(null);
  const [viewerDoc, setViewerDoc] = useState<DocumentRecord | null>(null);

  const filters = useMemo(() => ({ search, sort: 'uploaded_desc' as const }), [search]);
  const { documents, loading, refresh } = useAllDocuments(filters);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Library" title="Documents" back={false} />
      <View className="px-6 mb-3">
        <Input value={search} onChangeText={setSearch} placeholder="Search documents" />
        {isAdminPlus(role) ? (
          <Button
            label="+ Upload"
            size="sm"
            variant="secondary"
            onPress={() => uploadRef.current?.open()}
            className="mt-3 self-start"
          />
        ) : null}
      </View>

      {loading ? <CardListSkeleton count={5} /> : null}
      {!loading && documents.length === 0 ? (
        <EmptyState title="No documents" message="Upload kennel documents to see them here." />
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-6 pb-12 gap-3"
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.gold} />}
          renderItem={({ item }) => (
            <DocumentCard
              document={item}
              readOnly={!isAdminPlus(role)}
              onView={setViewerDoc}
              onEdit={isAdminPlus(role) ? (d) => uploadRef.current?.open(d) : undefined}
              onDeleted={refresh}
            />
          )}
        />
      )}

      {isAdminPlus(role) ? (
        <UploadDocumentSheet
          ref={uploadRef}
          entityType="kennel"
          entityId={KENNEL_DOCUMENT_ENTITY_ID}
          onSaved={refresh}
        />
      ) : null}

      <DocumentViewer document={viewerDoc} visible={!!viewerDoc} onClose={() => setViewerDoc(null)} />
    </ScreenContainer>
  );
}
