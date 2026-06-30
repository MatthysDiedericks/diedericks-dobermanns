# Cursor Prompt — Client Portal: Categorised Document Library

## Stack Context
- React Native, Expo SDK 56, TypeScript strict, Expo Router, NativeWind
- Supabase project: nlmwxodvquwbjinhhbmr
- Brand: Background `#111008`, Surface `#1C1A0E`, Gold `#C4A35A`, Text `#F5F0E8`

---

## What Already Exists — Read Before Starting

| File | Purpose |
|------|---------|
| `app/(portal)/documents.tsx` | Client documents screen — currently flat list, no categories |
| `hooks/useDocuments.ts` | `useClientPortalDocuments()` — fetches docs where `client_visible=true` OR user is in `allowed_user_ids` |
| `lib/documents/constants.ts` | `DOG_CATEGORIES`, `CLIENT_CATEGORIES`, etc. — category strings used at upload time |
| `components/documents/DocumentCard.tsx` | Existing document card component — reuse, do NOT rebuild |
| `components/documents/DocumentViewer.tsx` | Document viewer modal — reuse, do NOT rebuild |

### Key facts about the data model
- `documents.category` is a free-text string set by the admin when uploading (e.g. "Pedigree", "Health Certificate", "Vaccination Record", "Hip/Elbow Score", "Heart Test", "Eye Test", "DNA Test")
- `documents.client_visible = true` → visible to ALL clients
- `documents.allowed_user_ids[]` → visible to specific clients only
- `documents.entity_type` is the type of record the doc belongs to (e.g. `'dog'`, `'client'`, `'training'`)
- The existing `useClientPortalDocuments()` hook already applies the correct RLS-safe filter — do NOT change the query

---

## TASK 1 — Add "Parent Health Records" category to upload options

In `lib/documents/constants.ts`, add a new category to `DOG_CATEGORIES`:

```ts
export const DOG_CATEGORIES = [
  'Pedigree',
  'Registration',
  'Microchip',
  'DNA Test',
  'Health Certificate',
  'Vaccination Record',
  'Hip/Elbow Score',
  'Eye Test',
  'Heart Test',
  'Parent Health Records',   // ← ADD THIS — for sire/dam health docs shared with client
  'Import Permit',
  'Export Permit',
  'Insurance',
  'Show Certificate',
  'Training Certificate',
  'Other',
] as const;
```

Also add to `CLIENT_CATEGORIES`:
```ts
export const CLIENT_CATEGORIES = [
  'Purchase Agreement',
  'Puppy Guarantee',
  'Health Warranty',
  'Transfer of Ownership',
  'Parent Health Records',   // ← ADD THIS
  'NDA',
  'Other',
] as const;
```

This allows admins to explicitly tag sire/dam health documents as "Parent Health Records" when making them client-visible.

---

## TASK 2 — Create portal document grouping constants

Create `lib/documents/portalCategories.ts`:

```ts
/**
 * Maps portal display sections to the category strings used in the documents table.
 * Admin uploads use these category strings when setting client_visible=true.
 */

export interface PortalCategoryGroup {
  id: string
  label: string
  icon: string         // Ionicons name
  categories: string[] // Matches documents.category values
  description: string
}

export const PORTAL_CATEGORY_GROUPS: PortalCategoryGroup[] = [
  {
    id: 'health',
    label: 'Health Records',
    icon: 'heart-circle-outline',
    description: 'Vaccinations, health certificates, and vet records',
    categories: [
      'Health Certificate',
      'Vaccination Record',
      'Hip/Elbow Score',
      'Eye Test',
      'Heart Test',
    ],
  },
  {
    id: 'pedigree',
    label: 'Pedigree & Registration',
    icon: 'git-network-outline',
    description: 'Pedigree certificates, registration papers, and DNA tests',
    categories: [
      'Pedigree',
      'Registration',
      'DNA Test',
      'Microchip',
    ],
  },
  {
    id: 'parents',
    label: "Parents' Health",
    icon: 'people-outline',
    description: 'Health clearances and test results for sire and dam',
    categories: [
      'Parent Health Records',
    ],
  },
  {
    id: 'legal',
    label: 'Contracts & Legal',
    icon: 'document-text-outline',
    description: 'Purchase agreements, guarantees, and ownership transfers',
    categories: [
      'Purchase Agreement',
      'Puppy Guarantee',
      'Health Warranty',
      'Transfer of Ownership',
      'NDA',
    ],
  },
  {
    id: 'training',
    label: 'Training',
    icon: 'ribbon-outline',
    description: 'Training reports, certificates, and assessments',
    categories: [
      'Training Report',
      'Completion Certificate',
      'PSA Certificate',
      'Training Certificate',
    ],
  },
  {
    id: 'show',
    label: 'Show & Sport',
    icon: 'trophy-outline',
    description: 'Show certificates and sport achievements',
    categories: [
      'Show Certificate',
    ],
  },
]

// Builds a lookup: category string → group id
export function buildCategoryGroupMap(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const group of PORTAL_CATEGORY_GROUPS) {
    for (const cat of group.categories) {
      map[cat] = group.id
    }
  }
  return map
}
```

---

## TASK 3 — Upgrade `hooks/useDocuments.ts`

Add a new hook after `useClientPortalDocuments`:

```ts
export interface GroupedDocuments {
  groupId: string
  label: string
  icon: string
  description: string
  documents: DocumentRecord[]
  count: number
}

export function useClientPortalDocumentsByCategory() {
  const { documents, loading, error, refresh } = useClientPortalDocuments()

  const grouped = useMemo(() => {
    if (documents.length === 0) return []

    const categoryGroupMap = buildCategoryGroupMap()
    const groupMap = new Map<string, DocumentRecord[]>()

    // Bin each document into a group
    for (const doc of documents) {
      const groupId = categoryGroupMap[doc.category] ?? 'other'
      if (!groupMap.has(groupId)) groupMap.set(groupId, [])
      groupMap.get(groupId)!.push(doc)
    }

    const result: GroupedDocuments[] = []

    // Add defined groups (in order) that have documents
    for (const group of PORTAL_CATEGORY_GROUPS) {
      const docs = groupMap.get(group.id) ?? []
      if (docs.length > 0) {
        result.push({
          groupId: group.id,
          label: group.label,
          icon: group.icon,
          description: group.description,
          documents: docs.sort((a, b) =>
            new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
          ),
          count: docs.length,
        })
      }
    }

    // Append uncategorised docs in an "Other" group
    const other = groupMap.get('other') ?? []
    if (other.length > 0) {
      result.push({
        groupId: 'other',
        label: 'Other',
        icon: 'folder-outline',
        description: 'Additional documents',
        documents: other,
        count: other.length,
      })
    }

    return result
  }, [documents])

  const totalCount = documents.length

  return { grouped, totalCount, loading, error, refresh }
}
```

Add imports at the top of the file:
```ts
import { useMemo } from 'react'
import { PORTAL_CATEGORY_GROUPS, buildCategoryGroupMap } from '@/lib/documents/portalCategories'
import type { GroupedDocuments } from '@/hooks/useDocuments' // self-referential for type export
```

---

## TASK 4 — Rebuild `app/(portal)/documents.tsx`

Replace the existing flat-list screen with a categorised view. Keep under 220 lines — all grouping logic is in the hook.

```tsx
// app/(portal)/documents.tsx
// Shows client-visible documents grouped by category (Health, Pedigree, Parents' Health, etc.)

import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, SectionList, View } from 'react-native'

import { DocumentCard } from '@/components/documents/DocumentCard'
import { DocumentViewer } from '@/components/documents/DocumentViewer'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { Typography } from '@/components/ui/Typography'
import { Colors } from '@/constants/colors'
import { useClientPortalDocumentsByCategory } from '@/hooks/useDocuments'
import type { DocumentRecord } from '@/lib/documents/types'

export default function DocumentsScreen() {
  const { grouped, totalCount, loading, error, refresh } = useClientPortalDocumentsByCategory()
  const [viewerDoc, setViewerDoc] = useState<DocumentRecord | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggleGroup(groupId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  // Build SectionList data — collapsed groups show 0 items
  const sections = grouped.map((g) => ({
    groupId: g.groupId,
    label: g.label,
    icon: g.icon,
    description: g.description,
    count: g.count,
    data: collapsed.has(g.groupId) ? [] : g.documents,
  }))

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Paperwork" title="Your Documents" back={false} />

      {/* Summary strip */}
      <View className="mx-6 mb-4 flex-row items-center rounded-xl border border-gold/20 bg-surface px-4 py-3">
        <Ionicons name="folder-open-outline" size={20} color={Colors.gold} />
        <Typography variant="subtitle" className="ml-3 flex-1">
          {totalCount} document{totalCount === 1 ? '' : 's'} shared with you
        </Typography>
      </View>

      {loading ? (
        // Skeleton — show 3 placeholder section headers
        <View className="px-6 gap-3">
          {[1, 2, 3].map((i) => (
            <View key={i} className="h-16 rounded-xl bg-surface animate-pulse" />
          ))}
        </View>
      ) : error ? (
        <View className="px-6">
          <Typography variant="caption" className="text-danger">{error}</Typography>
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
                <Ionicons name={section.icon as any} size={20} color={Colors.gold} />
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
          renderSectionFooter={({ section }) =>
            !collapsed.has(section.groupId) && section.data.length === 0 ? null : null
          }
          renderItem={({ item }) => (
            <View className="mb-2 ml-2">
              <DocumentCard
                document={item}
                readOnly
                onView={setViewerDoc}
              />
            </View>
          )}
        />
      )}

      <DocumentViewer
        document={viewerDoc}
        visible={!!viewerDoc}
        onClose={() => setViewerDoc(null)}
      />
    </ScreenContainer>
  )
}
```

---

## TASK 5 — Admin upload: document category guidance note

In `components/documents/UploadDocumentSheet.tsx`, find where `categoriesForEntity` renders the category picker. After the picker, add a small guidance note (only visible when entity_type is 'dog' or 'client' and category is being set):

```tsx
{/* Shown when admin uploads a doc they want clients to see */}
<Typography variant="caption" className="mt-1 text-ink-muted">
  Set "Client visible" to ON below to share this document with the client's portal.
  Use "Parent Health Records" for sire/dam health docs linked to a puppy.
</Typography>
```

This is a UX hint — it does not change any logic.

---

## TASK 6 — Add "Documents" to dashboard Quick Links

In `app/(portal)/dashboard.tsx`, update the QUICK_LINKS constant. Documents is already a tab in the bottom nav, so the quick link just reinforces discoverability.

Make sure the quick links grid includes:
```ts
{ href: '/(portal)/documents', icon: 'folder-open' as const, label: 'Documents' },
```

If it is already there, leave it. If the current grid has "Documents" as a generic doc icon, upgrade to `folder-open`.

---

## FILE STRUCTURE

```
lib/documents/
  constants.ts              ← ADD 'Parent Health Records' to DOG_CATEGORIES + CLIENT_CATEGORIES (Task 1)
  portalCategories.ts       ← CREATE — category grouping config (Task 2)

hooks/
  useDocuments.ts           ← ADD useClientPortalDocumentsByCategory + GroupedDocuments type (Task 3)

app/(portal)/
  documents.tsx             ← REBUILD — categorised sections (Task 4)

components/documents/
  UploadDocumentSheet.tsx   ← ADD small hint note (Task 5)

app/(portal)/
  dashboard.tsx             ← ENSURE Documents link uses folder-open icon (Task 6)
```

---

## HOW ADMIN MAKES DOCUMENTS VISIBLE TO CLIENTS

No database changes needed. The flow is already built:

1. Admin goes to Documents (Admin) → Upload
2. Sets entity type (e.g. "dog"), selects the dog
3. Chooses category: "Pedigree", "Health Certificate", "Parent Health Records", etc.
4. Turns ON "Client visible" toggle → now all clients see it
5. OR uses "Allowed users" to share only with specific clients

The client portal then shows documents grouped into the sections above.

---

## CRITICAL WARNINGS

- Do NOT change `useClientPortalDocuments()` query — RLS is correct
- Do NOT rebuild `DocumentCard` or `DocumentViewer` — they work
- The `category` field is free text — group matching is case-sensitive, match exactly as defined in `DOG_CATEGORIES`
- `SectionList` must use `keyExtractor` on the item's `id` field
- All client queries already filtered by RLS — no need to add extra `.eq('client_id')` filter; the `client_visible` and `allowed_user_ids` check handles it

---

## TESTING CHECKLIST

- [ ] Admin uploads a doc with "Pedigree" category, client_visible=ON → appears in "Pedigree & Registration" section in portal
- [ ] Admin uploads a doc with "Parent Health Records" category → appears in "Parents' Health" section
- [ ] Admin uploads a doc with "Health Certificate" → appears in "Health Records" section
- [ ] Admin uploads a doc with "Purchase Agreement" → appears in "Contracts & Legal" section
- [ ] Collapsing a section hides its documents; re-tapping expands
- [ ] Empty state shows when no documents are shared yet
- [ ] Pull-to-refresh works
- [ ] Document opens in viewer on tap
- [ ] Count badge on each section header is correct
- [ ] No TypeScript errors — `npx tsc --noEmit` passes
- [ ] No other client's documents visible (test with two test accounts)
- [ ] Documents tab still accessible from bottom nav
