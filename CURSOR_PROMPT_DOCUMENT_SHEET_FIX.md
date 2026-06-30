# CURSOR PROMPT — Document Sheet Fix + Expiring Dogs Focus Panel

## Context

**Project:** Diedericks Dobermanns — React Native / Expo  
**Backend:** Supabase project `nlmwxodvquwbjinhhbmr`  
**Stack:** Expo SDK 56, TypeScript strict, Expo Router, NativeWind, `@gorhom/bottom-sheet`  
**Brand:** Background `#111008` | Surface `#1C1A0E` | Gold `#C4A35A` | Text `#F5F0E8`

**Files to edit:**
- `components/documents/UploadDocumentSheet.tsx` — bottom sheet at 92% height, currently has no close button; date fields are plain text inputs asking for `YYYY-MM-DD`
- `app/(admin)/documents/index.tsx` — the main Documents tab screen (also used via `app/(tabs)/documents/index.tsx` which re-exports it); has an "Expiring soon" card but it's buried below multiple filter rows and not prominent enough
- `hooks/useDocuments.ts` — contains `useExpiringDocuments(withinDays, limit)` which queries `documents` table filtered by `expiry_date`

---

## Task 1 — Fix UploadDocumentSheet: add close button + fix date fields

### Problem A: Sheet gets stuck — no way to dismiss it

`UploadDocumentSheet` uses `BottomSheetModal` at 92% height with `enablePanDownToClose`. At 92% height the sheet has almost no room to pan down, and `BottomSheetScrollView` inside intercepts vertical touch events, so the pan-to-close gesture rarely works. Users get stuck.

**Fix:** Add an explicit close header row at the top of the sheet.

In `UploadDocumentSheet.tsx`, add this as the **first child** inside `<BottomSheetModal>`, before `<BottomSheetScrollView>`:

```tsx
{/* Close row — always visible above the scroll area */}
<View className="flex-row items-center justify-between px-6 pb-3 pt-4">
  <Typography variant="subtitle" className="text-gold">
    {editDoc ? 'Edit Document' : 'Upload Document'}
  </Typography>
  <Pressable
    onPress={close}
    hitSlop={12}
    className="rounded-full bg-surface p-2"
  >
    <Ionicons name="close" size={20} color={Colors.gold} />
  </Pressable>
</View>
```

Also update the `BottomSheetModal` props:

```tsx
<BottomSheetModal
  ref={sheetRef}
  snapPoints={snapPoints}
  enablePanDownToClose
  enableDynamicSizing={false}
  handleIndicatorStyle={{ backgroundColor: Colors.gold, width: 40 }}
  backgroundStyle={{ backgroundColor: Colors.surface }}
>
```

The `enableDynamicSizing={false}` combined with an explicit handle indicator ensures the sheet respects the snap point correctly.

### Problem B: Date fields are plain text inputs (YYYY-MM-DD placeholder)

The sheet has "Date of Document" and "Expiry Date" fields as plain `BottomSheetTextInput` components expecting manual text entry in `YYYY-MM-DD` format. This is the same pattern fixed elsewhere in the app — replace with a platform-aware date picker.

**Fix:** Create `components/ui/DateField.tsx` (if it doesn't already exist) — a reusable Platform-aware date picker:

```tsx
// components/ui/DateField.tsx
import { Platform } from 'react-native';

interface DateFieldProps {
  label: string;
  value: string;        // always YYYY-MM-DD
  onChange: (v: string) => void;
  optional?: boolean;
}

export function DateField({ label, value, onChange, optional }: DateFieldProps) {
  if (Platform.OS === 'web') {
    // Web: native <input type="date"> styled to brand
    return (
      <View className="mb-4">
        <Typography variant="label" className="mb-2">{label}{optional ? ' (optional)' : ''}</Typography>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            background: '#1C1A0E',
            color: '#F5F0E8',
            border: '1px solid rgba(196,163,90,0.4)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 14,
            width: '100%',
          }}
        />
      </View>
    );
  }

  // Native: DateTimePicker from @react-native-community/datetimepicker
  // Show a Pressable that opens the picker in a Modal
  const [show, setShow] = useState(false);
  const date = value ? new Date(value) : new Date();

  return (
    <View className="mb-4">
      <Typography variant="label" className="mb-2">{label}{optional ? ' (optional)' : ''}</Typography>
      <Pressable
        onPress={() => setShow(true)}
        className="rounded-xl border border-gold/40 bg-surface px-4 py-3"
      >
        <Typography variant="body" className={value ? '' : 'text-subtle'}>
          {value || (optional ? 'Not set' : 'Select date')}
        </Typography>
      </Pressable>
      {show ? (
        <DateTimePicker
          value={date}
          mode="date"
          display="spinner"
          onChange={(_event, selected) => {
            setShow(false);
            if (selected) onChange(format(selected, 'yyyy-MM-dd'));
          }}
          textColor={Colors.ink}
        />
      ) : null}
    </View>
  );
}
```

Imports needed: `DateTimePicker` from `@react-native-community/datetimepicker`, `format` from `date-fns`.

**In `UploadDocumentSheet.tsx`**, replace the two text-input date fields:

```tsx
// BEFORE (both fields):
<BottomSheetTextInput
  placeholder="YYYY-MM-DD"
  value={docDate}
  onChangeText={setDocDate}
  ...
/>

// AFTER:
<DateField
  label="Date of document"
  value={docDate}
  onChange={setDocDate}
  optional
/>

<DateField
  label="Expiry date"
  value={expiryDate}
  onChange={setExpiryDate}
  optional
/>
```

> **Important:** Inside a `BottomSheetModal`, the native DateTimePicker's Modal may conflict. Use `display="spinner"` inline (not a separate Modal) if `@gorhom/bottom-sheet` version ≥ 4. If there are conflicts, wrap the DateTimePicker in a regular `Modal` from `react-native` with `transparent animationType="slide"`.

---

## Task 2 — Documents tab: prominent Expiring Dogs focus panel

### Current state

`app/(admin)/documents/index.tsx` has `useExpiringDocuments(60, 10)` which returns documents expiring within 60 days. It shows them inside a `Card` below several filter rows. The user doesn't see it prominently when first opening the tab.

### Required change

When the Documents tab is opened, the **first visible thing** (above all filters and the document list) must be a dedicated "Needs Attention" panel showing dogs with expiring documents.

### Step 1: Create `useExpiringDogDocuments` hook in `hooks/useDocuments.ts`

Add a new exported hook alongside the existing `useExpiringDocuments`:

```typescript
export interface ExpiringDogDocument {
  documentId: string;
  documentName: string;
  category: string;
  expiryDate: string;           // YYYY-MM-DD
  daysRemaining: number;
  dogId: string;
  dogName: string;
  isOverdue: boolean;
}

export function useExpiringDogDocuments(withinDays = 90) {
  const [items, setItems] = useState<ExpiringDogDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = requireSupabase();
      const today = format(new Date(), 'yyyy-MM-dd');
      // Include already-expired docs too (expiry_date < today)
      const future = format(addDays(new Date(), withinDays), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('documents')
        .select(`
          id, document_name, category, expiry_date, entity_id,
          dog:dogs!documents_entity_id_fkey(id, name)
        `)
        .eq('entity_type', 'dog')
        .not('expiry_date', 'is', null)
        .lte('expiry_date', future)          // expiring within window OR already expired
        .order('expiry_date', { ascending: true })
        .limit(20);

      if (error) throw error;

      const todayDate = new Date();
      const mapped: ExpiringDogDocument[] = (data ?? [])
        .filter((r) => r.dog != null)
        .map((r) => {
          const expiry = parseISO(r.expiry_date);
          const days = differenceInDays(expiry, todayDate);
          const dog = r.dog as { id: string; name: string } | null;
          return {
            documentId: r.id,
            documentName: r.document_name,
            category: r.category,
            expiryDate: r.expiry_date,
            daysRemaining: days,
            dogId: dog?.id ?? r.entity_id,
            dogName: dog?.name ?? 'Unknown dog',
            isOverdue: days < 0,
          };
        });

      setItems(mapped);
    } catch (e) {
      console.error('[useExpiringDogDocuments]', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [withinDays]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { items, loading, refresh };
}
```

Add `parseISO`, `differenceInDays` to the `date-fns` imports at the top of the file.

> **Note:** The Supabase join `dog:dogs!documents_entity_id_fkey(id, name)` assumes a foreign key on `documents.entity_id → dogs.id`. If this FK does not exist in the DB, fall back to fetching dog names separately in a second query using `entity_id IN (...)`.

### Step 2: Create `components/documents/ExpiringDogsPanel.tsx`

New component — standalone panel displayed at the top of the Documents tab:

```tsx
interface ExpiringDogsPanelProps {
  onDogPress: (dogId: string) => void;
}

// Shows:
// - If 0 items: renders nothing (null)
// - If 1+ items: shows an attention card
```

**Layout (when items exist):**

```
┌─────────────────────────────────────────────────────┐
│ ⚠  NEEDS ATTENTION                                  │
│ Documents expiring within 90 days                   │
├─────────────────────────────────────────────────────┤
│ 🔴 OVERDUE                                          │
│  Zeus · Vaccination Record                          │
│  Expired 12 days ago              [View Dog →]      │
├─────────────────────────────────────────────────────┤
│ 🟡 Hailey · Hip/Elbow Score                        │
│  Expires in 14 days — 12 Jun 2026 [View Dog →]     │
├─────────────────────────────────────────────────────┤
│ 🟡 Santini · Import Permit                         │
│  Expires in 38 days — 4 Jul 2026  [View Dog →]     │
└─────────────────────────────────────────────────────┘
```

**Colour coding:**
- `isOverdue` (days < 0) → red row with red icon `●`
- `daysRemaining < 30` → gold/amber row with amber icon `●`
- `daysRemaining 30–90` → subtle row with white icon `●`

**Label text:**
- `isOverdue` → `Expired ${Math.abs(daysRemaining)} day${plural} ago`
- Otherwise → `Expires in ${daysRemaining} day${plural} — ${formatKennelDate(expiryDate)}`

**Tap:** Each row calls `onDogPress(dogId)` to navigate to the dog profile.

**Component signature:**
```tsx
export function ExpiringDogsPanel({ onDogPress }: ExpiringDogsPanelProps) {
  const { items, loading } = useExpiringDogDocuments(90);
  if (!loading && items.length === 0) return null;
  // render...
}
```

Keep this file under 120 lines.

### Step 3: Update `app/(admin)/documents/index.tsx`

1. Import `ExpiringDogsPanel` and `useRouter`
2. Place `ExpiringDogsPanel` **above all filters**, immediately after the `PageHeader`:

```tsx
const router = useRouter();

// After <PageHeader>:
<ExpiringDogsPanel
  onDogPress={(dogId) =>
    router.push({ pathname: '/(admin)/dogs/[id]', params: { id: dogId } } as never)
  }
/>

// Then search input, then entity filter chips, then sort chips, then document list
```

3. **Remove** the existing buried "Expiring soon (60 days)" card that was inside the `ScrollView` — it is replaced by `ExpiringDogsPanel` at the top.

4. Add a count badge to the Documents tab icon if there are overdue or imminently expiring items. This requires passing the count from `ExpiringDogsPanel` up via a callback prop `onCountChange?: (count: number) => void`, which the screen captures in state and could use in future for a badge. Wire it up but leave the actual tab badge implementation for a future prompt — just ensure the hook result is accessible.

---

## File summary

| Action | File |
|--------|------|
| CREATE | `components/ui/DateField.tsx` |
| CREATE | `components/documents/ExpiringDogsPanel.tsx` |
| EDIT | `components/documents/UploadDocumentSheet.tsx` — close button, handle indicator, DateField for date inputs |
| EDIT | `hooks/useDocuments.ts` — add `useExpiringDogDocuments` + required imports |
| EDIT | `app/(admin)/documents/index.tsx` — add ExpiringDogsPanel at top, remove buried expiry card |

---

## Execution order

1. Create `components/ui/DateField.tsx`
2. Edit `hooks/useDocuments.ts` — add `useExpiringDogDocuments`
3. Create `components/documents/ExpiringDogsPanel.tsx`
4. Edit `components/documents/UploadDocumentSheet.tsx`
5. Edit `app/(admin)/documents/index.tsx`

---

## Critical rules

- `DateField` must handle `Platform.OS` correctly — web gets `<input type="date">`, native gets DateTimePicker
- DateTimePicker import: `import DateTimePicker from '@react-native-community/datetimepicker'` — it is already installed
- `format` from `date-fns` is already used throughout the codebase — use it, do not use `toISOString().slice(0,10)` for date formatting
- `BottomSheetModal` close button must use `Ionicons name="close"` — do not use a Text "×" character
- The `ExpiringDogsPanel` must return `null` (not an empty container) when there are zero expiring items — it should take up zero space
- The Supabase FK join for dogs may not exist — if the query returns `dog: null` for valid entity_ids, fall back to a two-query approach: fetch documents, then fetch `dogs` by `id IN (entity_ids)` and merge
- No TypeScript errors — run `npx tsc --noEmit` before finishing
- All files under 300 lines

---

## Testing checklist

- [ ] Open Upload Document sheet → close button (×) is visible at top right
- [ ] Tapping × dismisses the sheet immediately
- [ ] Date of document field shows a calendar picker on native (not a text box)
- [ ] Expiry date field shows a calendar picker on native (not a text box)
- [ ] Dates selected via picker populate in YYYY-MM-DD format correctly
- [ ] Sheet still dismisses by panning down when content is not scrolled
- [ ] Documents tab opens with ExpiringDogsPanel at the very top
- [ ] Overdue documents show in red
- [ ] Documents expiring in < 30 days show in gold/amber
- [ ] Documents expiring in 30–90 days show in white/subtle
- [ ] Tapping a dog row navigates to `/(admin)/dogs/[id]` for that dog
- [ ] When no dog documents are expiring, ExpiringDogsPanel renders nothing and takes no space
- [ ] No TypeScript errors
