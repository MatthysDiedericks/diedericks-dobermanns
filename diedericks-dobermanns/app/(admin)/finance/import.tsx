import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { ImportPreviewRow } from '@/components/finance/ImportPreviewRow';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useExpenseCategories } from '@/hooks/useExpenses';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import {
  bulkImportExpenses,
  downloadImportTemplate,
  parseExcelFile,
  parseImportRows,
} from '@/lib/finance/importUtils';
import type { ImportRow } from '@/types/finance';
import { useAuthStore } from '@/stores/authStore';

export default function FinanceImportScreen() {
  const router = useRouter();
  const { categories } = useExpenseCategories();
  const profileId = useAuthStore((s) => s.profile?.id ?? null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [importing, setImporting] = useState(false);

  const validRows = useMemo(() => rows.filter((r) => r.valid), [rows]);
  const invalidRows = useMemo(() => rows.filter((r) => !r.valid), [rows]);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setFileName(asset.name);
      const raw = await parseExcelFile(asset.uri);
      const parsed = parseImportRows(raw.slice(1), categories);
      setRows(parsed);
      setShowErrors(false);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not parse file.');
    }
  };

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const count = await bulkImportExpenses(validRows, profileId);
      showSaved(`${count} expenses imported`);
      router.back();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="Finance" title="Import from Excel" />

      <View className="flex-none px-6">
        <Typography variant="caption" className="mb-4 text-subtle">
          Columns: Date · Description · Amount · Category · Supplier · Notes
        </Typography>
        <Button label="⬇ Download template" variant="outline" onPress={() => void downloadImportTemplate()} />
        <Button label="📂 Choose file" className="mt-3" onPress={() => void pickFile()} />
        <Typography variant="caption" className="my-3 text-subtle">
          {fileName ?? 'No file selected'}
        </Typography>
        {invalidRows.length > 0 ? (
          <Pressable onPress={() => setShowErrors((v) => !v)} className="mb-3">
            <Typography variant="caption" className="text-gold">
              ⚠ {invalidRows.length} rows could not be imported — {showErrors ? 'Hide' : 'View'} errors
            </Typography>
          </Pressable>
        ) : null}
      </View>

      <View className="flex-1 px-6">
        {rows.length > 0 ? (
          <>
            <Typography variant="label" className="mb-3 text-gold">
              PREVIEW ({rows.length} rows)
            </Typography>
            <FlatList
              data={showErrors ? invalidRows : validRows}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => <ImportPreviewRow row={item} />}
              contentContainerStyle={{ paddingBottom: 120 }}
              showsVerticalScrollIndicator={false}
            />
          </>
        ) : null}
      </View>

      <View className="absolute bottom-6 left-6 right-6 flex-row gap-3">
        <Button label="Cancel" variant="outline" className="flex-1" onPress={() => router.back()} />
        <Button
          label={`Import ${validRows.length} rows →`}
          className="flex-1"
          loading={importing}
          disabled={validRows.length === 0}
          onPress={() => void handleImport()}
        />
      </View>
    </ScreenContainer>
  );
}
