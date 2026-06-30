import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, SectionList, View } from 'react-native';

import { DocumentCard } from '@/components/documents/DocumentCard';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useClientPortalDocumentsByCategory } from '@/hooks/useDocuments';
import type { DocumentRecord } from '@/lib/documents/types';

type DocumentSection = {
  groupId: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  count: number;
  data: DocumentRecord[];
};

export default function DocumentsScreen() {
  const { grouped, totalCount, loading, error, refresh } = useClientPortalDocumentsByCategory();
  const [viewerDoc, setViewerDoc] = useState<DocumentRecord | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleGroup(groupId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  const sections: DocumentSection[] = grouped.map((g) => ({
    groupId: g.groupId,
    label: g.label,
    icon: g.icon as keyof typeof Ionicons.glyphMap,
    description: g.description,
    count: g.count,
    data: collapsed.has(g.groupId) ? [] : g.documents,
  }));

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Paperwork" title="Your Documents" back={false} />

      <View className="mx-6 mb-4 flex-row items-center rounded-xl border border-gold/20 bg-surface px-4 py-3">
        <Ionicons name="folder-open-outline" size={20} color={Colors.gold} />
        <Typography variant="subtitle" className="ml-3 flex-1">
          {totalCount} document{totalCount === 1 ? '' : 's'} shared with you
        </Typography>
      </View>

      {loading ? (
        <View className="gap-3 px-6">
          {[1, 2, 3].map((i) => (
            <View key={i} className="h-16 rounded-xl bg-surface" />
          ))}
        </View>
      ) : error ? (
        <View className="px-6">
          <Typography variant="caption" className="text-danger">
            {error}
          </Typography>
        </View>
      ) : grouped.length === 0 ? (
        <EmptyState
          title="No documents yet"
          message="Documents shared by the kennel — health records, pedigrees, and contracts — will appear here once uploaded by the team."
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(doc) => doc.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          onRefresh={refresh}
          refreshing={loading}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Pressable
              onPress={() => toggleGroup(section.groupId)}
              className="mb-2 mt-4 flex-row items-center rounded-xl border border-gold/20 bg-surface px-4 py-3"
            >
              <View className="h-9 w-9 items-center justify-center rounded-lg bg-gold/10">
                <Ionicons name={section.icon} size={20} color={Colors.gold} />
              </View>
              <View className="ml-3 flex-1">
                <Typography variant="subtitle">{section.label}</Typography>
                <Typography variant="caption" className="text-ink-muted">
                  {section.count} document{section.count === 1 ? '' : 's'}
                </Typography>
              </View>
              <Ionicons
                name={collapsed.has(section.groupId) ? 'chevron-down' : 'chevron-up'}
                size={18}
                color={Colors.silver}
              />
            </Pressable>
          )}
          renderItem={({ item }) => (
            <View className="mb-2 ml-2">
              <DocumentCard document={item} readOnly onView={setViewerDoc} />
            </View>
          )}
        />
      )}

      <DocumentViewer document={viewerDoc} visible={!!viewerDoc} onClose={() => setViewerDoc(null)} />
    </ScreenContainer>
  );
}
