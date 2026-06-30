import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Image, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useGetSignedUrl } from '@/hooks/useDocuments';
import { expiryLabel, expiryStatus, expiryColor } from '@/lib/documents/expiry';
import type { DocumentRecord } from '@/lib/documents/types';
import { formatKennelDate } from '@/lib/kennel/formatters';

interface DocumentViewerProps {
  document: DocumentRecord | null;
  visible: boolean;
  onClose: () => void;
}

export function DocumentViewer({ document, visible, onClose }: DocumentViewerProps) {
  const { getSignedUrl } = useGetSignedUrl();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openDocument() {
    if (!document || loading) return;
    setLoading(true);
    setError(null);
    try {
      const url = await getSignedUrl(document, 'view');
      if (document.file_type === 'pdf') {
        await Linking.openURL(url);
        onClose();
      } else if (document.file_type === 'jpg' || document.file_type === 'png') {
        setImageUrl(url);
      } else {
        const localPath = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}${document.original_filename}`;
        const downloaded = await FileSystem.downloadAsync(url, localPath);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloaded.uri);
        } else {
          await Linking.openURL(downloaded.uri);
        }
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open document');
    } finally {
      setLoading(false);
    }
  }

  if (!document) return null;

  const exp = expiryStatus(document.expiry_date);
  const expText = expiryLabel(document.expiry_date);

  return (
    <>
      <Modal visible={visible && !imageUrl} onClose={onClose} title={document.document_name}>
        <Typography variant="caption" className="text-ink-muted">
          {document.category}
          {document.date_of_document ? ` · ${formatKennelDate(document.date_of_document)}` : ''}
        </Typography>
        {document.issued_by ? (
          <Typography variant="caption" className="mt-1 text-ink-muted">
            Issued by {document.issued_by}
          </Typography>
        ) : null}
        {document.document_number ? (
          <Typography variant="caption" className="mt-1 text-ink-muted">
            Ref {document.document_number}
          </Typography>
        ) : null}
        {expText ? (
          <Typography variant="caption" className="mt-2" style={{ color: expiryColor(exp) }}>
            {expText}
          </Typography>
        ) : null}
        {document.description ? (
          <Typography variant="body" className="mt-3">
            {document.description}
          </Typography>
        ) : null}
        {error ? (
          <Typography variant="caption" className="mt-3 text-danger">
            {error}
          </Typography>
        ) : null}
        <Pressable
          onPress={openDocument}
          className="mt-6 items-center rounded-sm border border-gold bg-gold/15 py-3"
        >
          <Typography variant="label" className="text-gold">
            {loading ? 'Opening…' : 'Open document'}
          </Typography>
        </Pressable>
      </Modal>

      <Modal visible={!!imageUrl} onClose={() => { setImageUrl(null); onClose(); }} title={document.document_name}>
        <ScrollView
          maximumZoomScale={Platform.OS === 'ios' ? 4 : 1}
          minimumZoomScale={1}
          contentContainerStyle={{ alignItems: 'center' }}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: '100%', height: 400, resizeMode: 'contain' }}
            />
          ) : null}
        </ScrollView>
        <Pressable
          onPress={async () => {
            if (!imageUrl || !document) return;
            const localPath = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}${document.original_filename}`;
            const downloaded = await FileSystem.downloadAsync(imageUrl, localPath);
            if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(downloaded.uri);
          }}
          className="mt-4 flex-row items-center justify-center gap-2 rounded-sm border border-gold/30 py-2"
        >
          <Ionicons name="download-outline" size={18} color={Colors.gold} />
          <Typography variant="label">Download</Typography>
        </Pressable>
      </Modal>
    </>
  );
}

export async function exportDocumentFile(
  document: DocumentRecord,
  getSignedUrl: (doc: DocumentRecord, action: 'view' | 'download' | 'export') => Promise<string>,
) {
  const url = await getSignedUrl(document, 'download');
  const localPath = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}${document.original_filename}`;
  const downloaded = await FileSystem.downloadAsync(url, localPath);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(downloaded.uri);
  } else {
    await Linking.openURL(downloaded.uri);
  }
}
