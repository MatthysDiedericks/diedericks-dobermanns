import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useUploadDocument, useUpdateDocument } from '@/hooks/useDocuments';
import {
  ACCEPTED_MIME_TYPES,
  categoriesForEntity,
  type DocumentEntityType,
  MAX_DOCUMENT_BYTES,
} from '@/lib/documents/constants';
import type { DocumentRecord, PickedDocumentFile } from '@/lib/documents/types';
import { parseDateInput } from '@/lib/dogDetail/feedback';

export interface UploadDocumentSheetHandle {
  open: (editDoc?: DocumentRecord) => void;
  close: () => void;
}

interface UploadDocumentSheetProps {
  entityType: DocumentEntityType;
  entityId: string;
  onSaved: () => void;
}

type Visibility = 'admin' | 'client' | 'trainer' | 'public';

function ChipPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="mb-4">
      <Typography variant="label" className="mb-2">
        {label}
      </Typography>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              className={`rounded-full border px-3 py-1.5 ${active ? 'border-gold bg-gold/15' : 'border-gold/25 bg-surface'}`}
            >
              <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>
                {o.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const UploadDocumentSheet = forwardRef<UploadDocumentSheetHandle, UploadDocumentSheetProps>(
  function UploadDocumentSheet({ entityType, entityId, onSaved }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['92%'], []);
    const categories = categoriesForEntity(entityType);

    const { upload, uploading } = useUploadDocument(entityType, entityId);
    const { update, updating } = useUpdateDocument();

    const [editId, setEditId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [category, setCategory] = useState(categories[0] ?? 'Other');
    const [dateOfDocument, setDateOfDocument] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [documentNumber, setDocumentNumber] = useState('');
    const [issuedBy, setIssuedBy] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState<Visibility>('admin');
    const [file, setFile] = useState<PickedDocumentFile | null>(null);
    const [previewUri, setPreviewUri] = useState<string | null>(null);

    const reset = useCallback(() => {
      setEditId(null);
      setName('');
      setCategory(categories[0] ?? 'Other');
      setDateOfDocument('');
      setExpiryDate('');
      setDocumentNumber('');
      setIssuedBy('');
      setDescription('');
      setVisibility('admin');
      setFile(null);
      setPreviewUri(null);
    }, [categories]);

    const open = useCallback(
      (editDoc?: DocumentRecord) => {
        reset();
        if (editDoc) {
          setEditId(editDoc.id);
          setName(editDoc.document_name);
          setCategory(editDoc.category);
          setDateOfDocument(editDoc.date_of_document ?? '');
          setExpiryDate(editDoc.expiry_date ?? '');
          setDocumentNumber(editDoc.document_number ?? '');
          setIssuedBy(editDoc.issued_by ?? '');
          setDescription(editDoc.description ?? '');
          if (editDoc.is_public) setVisibility('public');
          else if (editDoc.client_visible) setVisibility('client');
          else setVisibility('admin');
        }
        sheetRef.current?.present();
      },
      [reset],
    );

    const close = useCallback(() => {
      sheetRef.current?.dismiss();
      reset();
    }, [reset]);

    useImperativeHandle(ref, () => ({ open, close }), [open, close]);

    async function pickFile() {
      const result = await DocumentPicker.getDocumentAsync({
        type: ACCEPTED_MIME_TYPES,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if ((asset.size ?? 0) > MAX_DOCUMENT_BYTES) {
        Alert.alert('File too large', 'Maximum file size is 20MB.');
        return;
      }
      const picked: PickedDocumentFile = {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        size: asset.size ?? 0,
      };
      setFile(picked);
      if (!name.trim()) {
        const base = asset.name.replace(/\.[^.]+$/, '');
        setName(base);
      }
      if (asset.mimeType?.startsWith('image/')) setPreviewUri(asset.uri);
      else setPreviewUri(null);
    }

    async function submit() {
      if (!name.trim() || !category) {
        Alert.alert('Required fields', 'Document name and category are required.');
        return;
      }
      if (visibility === 'public') {
        Alert.alert(
          'Public document',
          'This document will be visible on the public website. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Confirm', onPress: () => doSubmit() },
          ],
        );
        return;
      }
      await doSubmit();
    }

    async function doSubmit() {
      try {
        const meta = {
          name: name.trim(),
          category,
          dateOfDocument: parseDateInput(dateOfDocument),
          expiryDate: parseDateInput(expiryDate),
          documentNumber: documentNumber.trim() || null,
          issuedBy: issuedBy.trim() || null,
          description: description.trim() || null,
          clientVisible: visibility === 'client',
          isPublic: visibility === 'public',
        };

        if (editId) {
          await update(editId, {
            document_name: meta.name,
            category: meta.category,
            date_of_document: meta.dateOfDocument,
            expiry_date: meta.expiryDate,
            document_number: meta.documentNumber,
            issued_by: meta.issuedBy,
            description: meta.description,
            client_visible: meta.clientVisible,
            is_public: meta.isPublic,
          });
        } else {
          if (!file) {
            Alert.alert('Choose a file', 'Select a file to upload.');
            return;
          }
          await upload(file, meta);
        }
        onSaved();
        close();
      } catch (e) {
        Alert.alert('Upload failed', e instanceof Error ? e.message : 'Unknown error');
      }
    }

    const busy = uploading || updating;

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableDynamicSizing={false}
        handleIndicatorStyle={{ backgroundColor: Colors.gold, width: 40 }}
        backgroundStyle={{ backgroundColor: Colors.surface }}
      >
        <View className="flex-row items-center justify-between px-6 pb-3 pt-4">
          <Typography variant="subtitle" className="text-gold">
            {editId ? 'Edit Document' : 'Upload Document'}
          </Typography>
          <Pressable onPress={close} hitSlop={12} className="rounded-full bg-surface p-2">
            <Ionicons name="close" size={20} color={Colors.gold} />
          </Pressable>
        </View>

        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}>
          <Typography variant="label" className="mb-1">
            Document name *
          </Typography>
          <BottomSheetTextInput
            value={name}
            onChangeText={setName}
            placeholder="Display name"
            placeholderTextColor={Colors.silver}
            style={{ borderWidth: 1, borderColor: 'rgba(196,163,90,0.3)', borderRadius: 4, padding: 12, color: '#F5F0E8', marginBottom: 16 }}
          />

          <ChipPicker
            label="Category *"
            options={categories.map((c) => ({ value: c, label: c }))}
            value={category}
            onChange={setCategory}
          />

          {entityType === 'dog' || entityType === 'client' ? (
            <Typography variant="caption" className="mt-1 text-ink-muted">
              Set &quot;Client visible&quot; to ON below to share this document with the client&apos;s portal.
              Use &quot;Parent Health Records&quot; for sire/dam health docs linked to a puppy.
            </Typography>
          ) : null}

          <DateField label="Date of document" value={dateOfDocument} onChange={setDateOfDocument} optional />

          <DateField label="Expiry date" value={expiryDate} onChange={setExpiryDate} optional />

          <Typography variant="label" className="mb-1">
            Document number
          </Typography>
          <BottomSheetTextInput
            value={documentNumber}
            onChangeText={setDocumentNumber}
            placeholder="Certificate / reference number"
            placeholderTextColor={Colors.silver}
            style={{ borderWidth: 1, borderColor: 'rgba(196,163,90,0.3)', borderRadius: 4, padding: 12, color: '#F5F0E8', marginBottom: 16 }}
          />

          <Typography variant="label" className="mb-1">
            Issued by
          </Typography>
          <BottomSheetTextInput
            value={issuedBy}
            onChangeText={setIssuedBy}
            placeholder="Organisation name"
            placeholderTextColor={Colors.silver}
            style={{ borderWidth: 1, borderColor: 'rgba(196,163,90,0.3)', borderRadius: 4, padding: 12, color: '#F5F0E8', marginBottom: 16 }}
          />

          <Typography variant="label" className="mb-1">
            Description
          </Typography>
          <BottomSheetTextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Optional notes"
            placeholderTextColor={Colors.silver}
            multiline
            style={{ borderWidth: 1, borderColor: 'rgba(196,163,90,0.3)', borderRadius: 4, padding: 12, color: '#F5F0E8', marginBottom: 16, minHeight: 80, textAlignVertical: 'top' }}
          />

          <Typography variant="label" className="mb-2">
            Who can see this document?
          </Typography>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {(
              [
                { v: 'admin' as const, l: 'Admin only' },
                { v: 'client' as const, l: 'Share with client' },
                { v: 'trainer' as const, l: 'Share with trainer' },
                { v: 'public' as const, l: 'Public' },
              ] as const
            ).map((o) => (
              <Pressable
                key={o.v}
                onPress={() => setVisibility(o.v)}
                className={`rounded-full border px-3 py-1.5 ${visibility === o.v ? 'border-gold bg-gold/15' : 'border-gold/25'}`}
              >
                <Typography variant="caption" className={visibility === o.v ? 'text-gold' : ''}>
                  {o.l}
                </Typography>
              </Pressable>
            ))}
          </View>

          {!editId ? (
            <>
              <Pressable
                onPress={pickFile}
                className="mb-3 flex-row items-center justify-center gap-2 rounded-sm border border-dashed border-gold/40 py-4"
              >
                <Ionicons name="cloud-upload-outline" size={22} color={Colors.gold} />
                <Typography variant="label" className="text-gold">
                  Choose file
                </Typography>
              </Pressable>
              {file ? (
                <View className="mb-4 flex-row items-center gap-3">
                  {previewUri ? (
                    <Image source={{ uri: previewUri }} style={{ width: 48, height: 48, borderRadius: 4 }} />
                  ) : (
                    <Ionicons name="document-text" size={40} color={Colors.gold} />
                  )}
                  <View className="flex-1">
                    <Typography variant="body">{file.name}</Typography>
                    <Typography variant="caption">{Math.round(file.size / 1024)} KB</Typography>
                  </View>
                </View>
              ) : null}
            </>
          ) : null}

          <Button
            label={editId ? 'Save changes' : 'Upload document'}
            onPress={submit}
            loading={busy}
            className="mt-2"
          />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
