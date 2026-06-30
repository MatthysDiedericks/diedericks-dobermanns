import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';

import { DocumentCard } from '@/components/documents/DocumentCard';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import {
  UploadDocumentSheet,
  type UploadDocumentSheetHandle,
} from '@/components/documents/UploadDocumentSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useDocumentsForEntity, useUpdateDocument } from '@/hooks/useDocuments';
import type { DocumentEntityType } from '@/lib/documents/constants';
import type { DocumentRecord } from '@/lib/documents/types';

type FileFilter = 'all' | 'pdf' | 'images' | 'certificates' | 'other';
type SortMode = 'newest' | 'oldest' | 'az' | 'expiry';

const FILE_FILTERS: { id: FileFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pdf', label: 'PDF' },
  { id: 'images', label: 'Images' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'other', label: 'Other' },
];

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'az', label: 'A–Z' },
  { id: 'expiry', label: 'Expiry date' },
];

const CERT_KEYWORDS = ['certificate', 'registration', 'pedigree', 'licence', 'permit', 'warranty', 'agreement'];

function matchesFilter(doc: DocumentRecord, filter: FileFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'pdf') return doc.file_type === 'pdf';
  if (filter === 'images') return doc.file_type === 'jpg' || doc.file_type === 'png';
  if (filter === 'certificates') {
    const hay = `${doc.category} ${doc.document_name}`.toLowerCase();
    return CERT_KEYWORDS.some((k) => hay.includes(k));
  }
  if (filter === 'other') {
    const isPdf = doc.file_type === 'pdf';
    const isImg = doc.file_type === 'jpg' || doc.file_type === 'png';
    const isCert = matchesFilter(doc, 'certificates');
    return !isPdf && !isImg && !isCert;
  }
  return true;
}

function sortDocuments(docs: DocumentRecord[], sort: SortMode): DocumentRecord[] {
  const copy = [...docs];
  if (sort === 'newest') copy.sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
  else if (sort === 'oldest') copy.sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at));
  else if (sort === 'az') copy.sort((a, b) => a.document_name.localeCompare(b.document_name));
  else if (sort === 'expiry') {
    copy.sort((a, b) => {
      if (!a.expiry_date && !b.expiry_date) return 0;
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return a.expiry_date.localeCompare(b.expiry_date);
    });
  }
  return copy;
}

interface DocumentListProps {
  entityType: DocumentEntityType;
  entityId: string;
  readOnly?: boolean;
  showUpload?: boolean;
  compact?: boolean;
}

export function DocumentList({
  entityType,
  entityId,
  readOnly = false,
  showUpload = true,
  compact = false,
}: DocumentListProps) {
  const { documents, loading, error, refresh } = useDocumentsForEntity(entityType, entityId);
  const { update } = useUpdateDocument();
  const uploadRef = useRef<UploadDocumentSheetHandle>(null);

  const [fileFilter, setFileFilter] = useState<FileFilter>('all');
  const [sort, setSort] = useState<SortMode>('newest');
  const [viewerDoc, setViewerDoc] = useState<DocumentRecord | null>(null);

  const filtered = useMemo(
    () => sortDocuments(documents.filter((d) => matchesFilter(d, fileFilter)), sort),
    [documents, fileFilter, sort],
  );

  function handleShare(doc: DocumentRecord) {
    Alert.alert('Share with client', 'Make this document visible in the client portal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Share',
        onPress: async () => {
          await update(doc.id, { client_visible: true });
          refresh();
        },
      },
    ]);
  }

  if (loading && documents.length === 0) {
    return (
      <View className="items-center py-8">
        <ActivityIndicator color={Colors.gold} />
      </View>
    );
  }

  return (
    <View>
      {!compact ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3" contentContainerStyle={{ gap: 8 }}>
            {FILE_FILTERS.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => setFileFilter(f.id)}
                className={`rounded-full border px-3 py-1.5 ${fileFilter === f.id ? 'border-gold bg-gold/15' : 'border-gold/25 bg-surface'}`}
              >
                <Typography variant="caption" className={fileFilter === f.id ? 'text-gold' : ''}>
                  {f.label}
                </Typography>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ gap: 8 }}>
            {SORT_OPTIONS.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setSort(s.id)}
                className={`rounded-full border px-3 py-1.5 ${sort === s.id ? 'border-gold bg-gold/15' : 'border-gold/25 bg-surface'}`}
              >
                <Typography variant="caption" className={sort === s.id ? 'text-gold' : ''}>
                  {s.label}
                </Typography>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      {showUpload && !readOnly ? (
        <Button
          label="+ Upload document"
          variant="secondary"
          size="sm"
          onPress={() => uploadRef.current?.open()}
          className="mb-4 self-start"
        />
      ) : null}

      {error ? <Typography variant="caption" className="mb-2 text-danger">{error}</Typography> : null}

      {filtered.length === 0 ? (
        <EmptyState title="No documents uploaded yet" message="Upload certificates, contracts, and records here." />
      ) : (
        filtered.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            readOnly={readOnly}
            onView={setViewerDoc}
            onEdit={(d) => uploadRef.current?.open(d)}
            onShare={handleShare}
            onDeleted={refresh}
          />
        ))
      )}

      {!readOnly ? (
        <UploadDocumentSheet
          ref={uploadRef}
          entityType={entityType}
          entityId={entityId}
          onSaved={refresh}
        />
      ) : null}

      <DocumentViewer
        document={viewerDoc}
        visible={!!viewerDoc}
        onClose={() => setViewerDoc(null)}
      />
    </View>
  );
}

interface DocumentSectionProps extends DocumentListProps {
  title?: string;
}

/** Section card wrapper for screens that embed documents inline (not as a tab). */
export function DocumentSection({ title = 'Documents', ...props }: DocumentSectionProps) {
  return (
    <View className="mt-6">
      <Typography variant="label" className="mb-3 text-gold">
        {title}
      </Typography>
      <DocumentList {...props} compact />
    </View>
  );
}
