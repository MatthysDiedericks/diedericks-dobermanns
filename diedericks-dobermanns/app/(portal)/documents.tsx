import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useClientPortalDocuments } from '@/hooks/useDocuments';
import { PORTAL_DOC_SECTIONS } from '@/lib/portal/documentGroups';
import { portalCategoryLabel } from '@/lib/portal/documentLabels';
import type { DocumentRecord } from '@/lib/documents/types';

function statusLine(doc: DocumentRecord): string | null {
  if (doc.provided_by !== 'client') return null;
  if (doc.review_status === 'verified' || doc.review_status === 'cleared') {
    return 'Confirmed by Diedericks Dobermanns';
  }
  if (doc.review_status === 'rejected') {
    return doc.review_note?.trim() || 'A clearer copy is needed — please upload again.';
  }
  return 'Sent to Diedericks Dobermanns — awaiting confirmation';
}

export default function DocumentsScreen() {
  const { documents, loading, error, refresh } = useClientPortalDocuments();
  const [viewerDoc, setViewerDoc] = useState<DocumentRecord | null>(null);

  const extras = useMemo(() => {
    const known = new Set(PORTAL_DOC_SECTIONS.flatMap((s) => s.slots.map((x) => x.category)));
    const cats = [...new Set(documents.map((d) => d.category).filter((c) => c && !known.has(c)))];
    return cats;
  }, [documents]);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Paperwork" title="Your Documents" back={false} />

      <View className="px-6 pb-10">
        {loading ? (
          <Typography variant="bodyMuted">Loading documents…</Typography>
        ) : error ? (
          <Typography variant="caption" className="text-danger">
            {error}
          </Typography>
        ) : null}

        {PORTAL_DOC_SECTIONS.map((section) => (
          <Card key={section.id} className="mb-4">
            <Typography variant="label" className="text-gold">
              {section.title.toUpperCase()}
            </Typography>
            {section.slots.map((slot) => {
              const matches = documents.filter((d) => d.category === slot.category);
              if (matches.length === 0) {
                return (
                  <Typography key={slot.category} variant="bodyMuted" className="mt-3">
                    {slot.label} — not yet on file
                  </Typography>
                );
              }
              return (
                <View key={slot.category} className="mt-3">
                  <Typography variant="caption" className="text-subtle">
                    {slot.label}
                  </Typography>
                  {matches.map((doc) => (
                    <Pressable
                      key={doc.id}
                      onPress={() => setViewerDoc(doc)}
                      className="mt-2 rounded-xl border border-gold/15 bg-black-rich px-3 py-3"
                    >
                      <Typography variant="body">{doc.document_name}</Typography>
                      {statusLine(doc) ? (
                        <Typography variant="caption" className="mt-1 text-gold">
                          {statusLine(doc)}
                        </Typography>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              );
            })}
          </Card>
        ))}

        {extras.map((category) => {
          const matches = documents.filter((d) => d.category === category);
          return (
            <Card key={category} className="mb-4">
              <Typography variant="label" className="text-gold">
                {portalCategoryLabel(category).toUpperCase()}
              </Typography>
              {matches.map((doc) => (
                <Pressable
                  key={doc.id}
                  onPress={() => setViewerDoc(doc)}
                  className="mt-2 rounded-xl border border-gold/15 bg-black-rich px-3 py-3"
                >
                  <Typography variant="body">{doc.document_name}</Typography>
                </Pressable>
              ))}
            </Card>
          );
        })}

        <Pressable onPress={() => void refresh()} className="mt-2">
          <Typography variant="caption" className="text-center text-gold">
            Refresh
          </Typography>
        </Pressable>
      </View>

      <DocumentViewer document={viewerDoc} visible={!!viewerDoc} onClose={() => setViewerDoc(null)} />
    </ScreenContainer>
  );
}
