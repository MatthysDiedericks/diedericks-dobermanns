import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useDeleteDocument, useGetSignedUrl } from '@/hooks/useDocuments';
import { expiryLabel, expiryStatus, expiryColor } from '@/lib/documents/expiry';
import type { DocumentRecord } from '@/lib/documents/types';
import { formatKennelDate } from '@/lib/kennel/formatters';

import { exportDocumentFile } from './DocumentViewer';

function fileIcon(type: string): keyof typeof Ionicons.glyphMap {
  if (type === 'pdf') return 'document-text';
  if (type === 'jpg' || type === 'png') return 'image';
  if (type === 'docx') return 'document';
  if (type === 'xlsx') return 'grid';
  return 'document-outline';
}

interface DocumentCardProps {
  document: DocumentRecord;
  onView: (doc: DocumentRecord) => void;
  onEdit?: (doc: DocumentRecord) => void;
  onShare?: (doc: DocumentRecord) => void;
  onDeleted?: () => void;
  readOnly?: boolean;
}

export function DocumentCard({
  document,
  onView,
  onEdit,
  onShare,
  onDeleted,
  readOnly = false,
}: DocumentCardProps) {
  const { getSignedUrl } = useGetSignedUrl();
  const { remove } = useDeleteDocument();
  const exp = expiryStatus(document.expiry_date);
  const expText = expiryLabel(document.expiry_date);

  function showMenu() {
    const options: { text: string; onPress?: () => void; style?: 'destructive' | 'cancel' }[] = [
      { text: 'View', onPress: () => onView(document) },
      {
        text: 'Download',
        onPress: () => {
          exportDocumentFile(document, getSignedUrl).catch((e) =>
            Alert.alert('Download failed', e instanceof Error ? e.message : 'Unknown error'),
          );
        },
      },
    ];
    if (!readOnly && onShare) options.push({ text: 'Share', onPress: () => onShare(document) });
    if (!readOnly && onEdit) options.push({ text: 'Edit', onPress: () => onEdit(document) });
    if (!readOnly) {
      options.push({
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete document', `Remove "${document.document_name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                await remove(document);
                onDeleted?.();
              },
            },
          ]);
        },
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(document.document_name, undefined, options);
  }

  const isImage = document.file_type === 'jpg' || document.file_type === 'png';

  return (
    <Card className="mb-3 flex-row items-start gap-3">
      <View className="h-12 w-12 items-center justify-center rounded-sm bg-gold/10">
        {isImage ? (
          <Ionicons name="image" size={24} color={Colors.gold} />
        ) : (
          <Ionicons name={fileIcon(document.file_type)} size={24} color={Colors.gold} />
        )}
      </View>
      <Pressable className="flex-1" onPress={() => onView(document)}>
        <Typography variant="subtitle">{document.document_name}</Typography>
        <View className="mt-1 flex-row flex-wrap items-center gap-2">
          <View className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5">
            <Typography variant="caption" className="text-gold">
              {document.category}
            </Typography>
          </View>
          {document.client_visible ? (
            <Ionicons name="eye-outline" size={14} color={Colors.gold} />
          ) : null}
        </View>
        {document.date_of_document ? (
          <Typography variant="caption" className="mt-1 text-ink-muted">
            {formatKennelDate(document.date_of_document)}
          </Typography>
        ) : null}
        {document.issued_by ? (
          <Typography variant="caption" className="text-ink-muted">
            {document.issued_by}
          </Typography>
        ) : null}
        {expText && exp !== 'ok' && exp !== 'none' ? (
          <Badge
            label={expText}
            tone={exp === 'expired' ? 'danger' : 'gold'}
            className="mt-2 self-start"
          />
        ) : null}
      </Pressable>
      {!readOnly ? (
        <Pressable onPress={showMenu} hitSlop={8} className="p-1">
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.silver} />
        </Pressable>
      ) : (
        <Pressable
          onPress={() =>
            exportDocumentFile(document, getSignedUrl).catch((e) =>
              Alert.alert('Download failed', e instanceof Error ? e.message : 'Unknown error'),
            )
          }
          hitSlop={8}
          className="p-1"
        >
          <Ionicons name="download-outline" size={20} color={Colors.gold} />
        </Pressable>
      )}
    </Card>
  );
}
