import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useClientPortalDocuments } from '@/hooks/useDocuments';
import { usePortalDogs } from '@/hooks/usePortal';
import { portalCategoryLabel } from '@/lib/portal/documentLabels';
import { requireSupabase } from '@/lib/supabase';
import type { DocumentRecord } from '@/lib/documents/types';

type ParentInfo = { id: string; name: string; role: string };

type OwnerGroup = {
  title: string;
  blurb: string;
  empty: string;
  buckets: { label: string; documents: DocumentRecord[] }[];
};

export default function DocumentsScreen() {
  const { documents, loading, error, refresh } = useClientPortalDocuments();
  const { dogs } = usePortalDogs();
  const [parents, setParents] = useState<ParentInfo[]>([]);
  const [viewerDoc, setViewerDoc] = useState<DocumentRecord | null>(null);

  const loadParents = useCallback(async () => {
    if (dogs.length === 0) {
      setParents([]);
      return;
    }
    try {
      const supabase = requireSupabase();
      const results = await Promise.all(
        dogs.map(async (d) => {
          const { data } = await supabase.rpc('my_dog_lineage', { target_dog_id: d.id });
          return (data ?? []) as { parent_id: string; role: string }[];
        }),
      );
      const byId = new Map<string, ParentInfo>();
      for (const links of results) {
        for (const link of links) {
          if (byId.has(link.parent_id)) continue;
          const { data: dog } = await supabase
            .from('dogs')
            .select('id, name')
            .eq('id', link.parent_id)
            .maybeSingle();
          if (dog) {
            byId.set(dog.id, {
              id: dog.id,
              name: dog.name,
              role: link.role === 'sire' ? 'Sire' : 'Dam',
            });
          }
        }
      }
      setParents([...byId.values()]);
    } catch (e) {
      console.error('[DocumentsScreen] lineage', e);
      setParents([]);
    }
  }, [dogs]);

  useEffect(() => {
    void loadParents();
  }, [loadParents]);

  const groups: OwnerGroup[] = useMemo(() => {
    const myDogIds = new Set(dogs.map((d) => d.id));
    const parentById = new Map(parents.map((p) => [p.id, p]));
    const yourDogDocs = new Map<string, DocumentRecord[]>();
    const parentDocs = new Map<string, DocumentRecord[]>();
    const kennelDocs: DocumentRecord[] = [];

    for (const doc of documents) {
      if (myDogIds.has(doc.entity_id)) {
        const list = yourDogDocs.get(doc.entity_id) ?? [];
        list.push(doc);
        yourDogDocs.set(doc.entity_id, list);
      } else if (parentById.has(doc.entity_id)) {
        const list = parentDocs.get(doc.entity_id) ?? [];
        list.push(doc);
        parentDocs.set(doc.entity_id, list);
      } else {
        kennelDocs.push(doc);
      }
    }

    return [
      {
        title: 'Your dog',
        blurb: "Papers and health records for the dog you own.",
        empty: 'Documents for your dog will appear here once a puppy is linked to your account.',
        buckets: dogs.map((d) => ({
          label: d.name,
          documents: yourDogDocs.get(d.id) ?? [],
        })),
      },
      {
        title: 'Sire and dam health',
        blurb:
          "These are the health tests carried out on your puppy's parents before the litter was planned.",
        empty: "Health documents for this litter's parents will appear here.",
        buckets: parents.map((p) => ({
          label: `${p.name} (${p.role})`,
          documents: parentDocs.get(p.id) ?? [],
        })),
      },
      {
        title: 'Kennel documents',
        blurb: 'General papers the kennel has shared with you.',
        empty: 'Nothing in this group yet.',
        buckets: kennelDocs.length
          ? [{ label: 'Shared with you', documents: kennelDocs }]
          : [],
      },
    ];
  }, [documents, dogs, parents]);

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
        ) : documents.length === 0 && dogs.length === 0 ? (
          <EmptyState
            title="No documents yet"
            message="Documents shared by the kennel — health records, pedigrees, and contracts — will appear here once uploaded by the team."
          />
        ) : (
          groups.map((group) => {
            const hasDocs = group.buckets.some((b) => b.documents.length > 0);
            const showEmpty =
              !hasDocs &&
              (group.title === 'Sire and dam health' ||
                group.title === 'Your dog' ||
                group.title === 'Kennel documents');
            return (
              <Card key={group.title} className="mb-4">
                <Typography variant="label" className="text-gold">
                  {group.title.toUpperCase()}
                </Typography>
                <Typography variant="caption" className="mt-1 text-ink-muted">
                  {group.blurb}
                </Typography>
                {showEmpty ? (
                  <Typography variant="bodyMuted" className="mt-3">
                    {group.empty}
                  </Typography>
                ) : (
                  group.buckets
                    .filter((b) => b.documents.length > 0)
                    .map((bucket) => (
                      <View key={bucket.label} className="mt-4">
                        <Typography variant="subtitle" className="mb-2">
                          {bucket.label}
                        </Typography>
                        {bucket.documents.map((doc) => (
                          <Pressable
                            key={doc.id}
                            onPress={() => setViewerDoc(doc)}
                            className="mb-2 rounded-xl border border-gold/15 bg-black-rich px-3 py-3"
                          >
                            <Typography variant="body">{doc.document_name}</Typography>
                            <Typography variant="caption" className="mt-1 text-gold">
                              {portalCategoryLabel(doc.category)}
                            </Typography>
                          </Pressable>
                        ))}
                      </View>
                    ))
                )}
              </Card>
            );
          })
        )}

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
