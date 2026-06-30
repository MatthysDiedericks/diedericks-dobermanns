# CURSOR PROMPT — Document Management System

## Context

**Project:** Diedericks Dobermanns mobile app
**Stack:** React Native, Expo Router, TypeScript, Supabase, NativeWind
**Brand:** Background `#111008`, Surface `#1C1A0E`, Gold `#C4A35A`, Text `#F5F0E8`
**Storage bucket:** `documents` (private — all access via signed URLs)

---

## What's Already in the Database (DO NOT recreate)

### `documents` table — central document store
All documents across the app use this ONE table, linked via:
- `entity_type` — 'dog' | 'litter' | 'puppy' | 'client' | 'application' | 'training' | 'contract' | 'kennel' | 'health' | 'show'
- `entity_id` — UUID of the linked record

Key fields:
- `document_name` — display name
- `original_filename` — original file name
- `storage_path` — Supabase Storage path
- `file_type` — 'pdf' | 'jpg' | 'png' | 'docx' | 'xlsx'
- `category` — see full list below
- `date_of_document` — date on the document (date stamped)
- `expiry_date` — for permits, insurance etc
- `issued_by` — organisation that issued it
- `document_number` — certificate/reference number
- `client_visible` — if true, linked client can see it in their portal
- `allowed_user_ids` — specific user UUIDs who can view
- `is_public` — visible on public website (rare)
- `uploaded_by` — who uploaded it
- `uploaded_at` — timestamp (auto)

### `document_access_log` table
Auto-log every view/download/export with user + timestamp.

### RLS already set:
- Admins: full access
- Trainers: dog/litter/training/health documents
- Clients: documents where client_visible=true OR their uid in allowed_user_ids

---

## STEP 1 — Regenerate Types

```bash
npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr > types/supabase.ts
```

---

## STEP 2 — Document Hooks (`hooks/useDocuments.ts`)

```ts
useDocumentsForEntity(entityType: string, entityId: string)
// SELECT * FROM documents WHERE entity_type = ? AND entity_id = ? ORDER BY uploaded_at DESC

useDocument(id: string)

useUploadDocument(entityType: string, entityId: string)
// 1. Upload file to Supabase Storage at: {entityType}/{entityId}/{timestamp}_{filename}
// 2. Insert record into documents table
// 3. Returns document record

useDeleteDocument(id: string)
// 1. Delete from Supabase Storage
// 2. Delete from documents table

useUpdateDocument(id: string)
// Update document metadata (name, category, visibility, expiry etc)

useGetSignedUrl(storagePath: string)
// Generate signed URL for private file access (60 min expiry)
// Log access to document_access_log

useShareDocument(documentId: string, userIds: string[])
// Update allowed_user_ids array for specific users
```

---

## STEP 3 — Reusable Document Components

### `components/documents/DocumentCard.tsx`
Displays a single document as a card:
- File type icon (PDF icon, image icon, Word icon)
- Document name (bold)
- Category chip (small gold pill)
- Date of document (dd MMM yyyy)
- Issued by (muted text)
- Expiry badge — red if expired, orange if expiring within 30 days
- Client visible indicator (eye icon if shared with client)
- Three-dot menu: View | Download | Share | Edit | Delete

### `components/documents/DocumentList.tsx`
- Takes `entityType` + `entityId` as props
- Shows list of DocumentCard components
- Empty state: "No documents uploaded yet"
- Filter chips at top: All | PDF | Images | Certificates | Other
- Sort: Newest | Oldest | A–Z | Expiry date

### `components/documents/UploadDocumentSheet.tsx`
Bottom sheet for uploading a document. Fields:

```
Document Name* (text — auto-fills from filename but editable)

Category* (dropdown — filtered by entity_type context):
  For Dog:
    Pedigree | Registration | Microchip | DNA Test | Health Certificate |
    Vaccination Record | Hip/Elbow Score | Eye Test | Heart Test |
    Import Permit | Export Permit | Insurance | Show Certificate |
    Training Certificate | Other
  For Litter:
    Litter Registration | Stud Agreement | Whelping Record |
    Puppy Birth Certificate | Other
  For Client/Sales:
    Purchase Agreement | Puppy Guarantee | Health Warranty |
    Transfer of Ownership | NDA | Other
  For Application:
    Application Supporting Doc | Vet Reference | ID Document | Other
  For Training:
    Training Report | Completion Certificate | PSA Certificate | Other
  For Kennel:
    Kennel Licence | Breed Society Registration | Vet Practice Agreement | Other

Date of Document (date picker — the date on the document itself)
Expiry Date (date picker — optional, for permits/insurance)
Document Number (text — certificate/reference number, optional)
Issued By (text — organisation name, optional)
Description (multiline — optional)

── VISIBILITY ──────────────────────────
Who can see this document?
  [ Admin Only ] [ Share with Client ] [ Share with Trainer ] [ Public ]
  
  If "Share with Client" selected:
    → Automatically sets client_visible = true
    → If entity_type = 'dog' or 'litter', links to reservations to find the client
  
  If "Public" selected (rare):
    → Warning: "This document will be visible on the public website"
    → Confirm required

── UPLOAD ──────────────────────────────
File picker button: "Choose File"
  Accepts: PDF, JPG, PNG, DOCX, XLSX
  Max size: 20MB
  Shows preview thumbnail for images, PDF icon for PDFs

[UPLOAD DOCUMENT] button
```

### `components/documents/DocumentViewer.tsx`
- For PDFs: use `expo-file-system` + `expo-sharing` to open in device PDF reader
- For images: show inline in modal with pinch-zoom
- For DOCX/XLSX: download + open with device default app
- Always log to `document_access_log` when opened
- Show: document name, date, issued by, document number at top

---

## STEP 4 — WHERE TO ADD DOCUMENTS IN THE APP

Add `<DocumentList entityType="X" entityId={id} />` + upload button to ALL these screens:

### 4a — Dog Detail Screen (`app/(admin)/dogs/[id]/index.tsx`)
Add a **"Documents" tab** (new tab alongside Overview, Health, Breeding, Shows)

Document categories shown here:
- Pedigree, Registration, Microchip, DNA Test, Health Certificate,
  Vaccination Record, Hip/Elbow Score, Eye Test, Heart Test,
  Import/Export Permit, Insurance, Show Certificate, Training Certificate

### 4b — Litter Detail Screen (`app/(admin)/litters/[id]/index.tsx`)
Add a **"Documents" tab**

Document categories:
- Litter Registration, Stud Agreement, Whelping Record, Puppy Birth Certificates

### 4c — Application Detail Screen (`app/(admin)/applications/[id]/index.tsx`)
Add a **"Documents" section** (not a tab — just a section card at the bottom)

Document categories:
- Application Supporting Doc, Vet Reference, ID Document

### 4d — Client Profile Screen (`app/(admin)/clients/[id]/index.tsx`)
Add a **"Documents" tab**

Document categories:
- Purchase Agreement, Puppy Guarantee, Health Warranty, Transfer of Ownership, NDA

### 4e — Training Booking Detail (`app/(admin)/training/[id]/index.tsx`)
Add a **"Documents" section**

Document categories:
- Training Report, Completion Certificate, PSA Certificate

### 4f — Kennel Documents screen (`app/(admin)/documents/index.tsx`)
This is the MASTER documents screen — shows ALL documents across the kennel.

Layout:
- Filter by entity type: All | Dogs | Litters | Clients | Training | Kennel
- Filter by category dropdown
- Filter by dog name search
- Sort by: Date uploaded | Document date | Expiry date
- Expiring soon section at top (expiry within 60 days) — red/orange badges
- Full list below

### 4g — Client Portal (`app/(portal)/documents/index.tsx`)
Client-facing documents screen — only shows documents where:
- `client_visible = true` AND linked to this client's dogs/reservations
- OR `allowed_user_ids` includes this client's user ID

Layout:
- Simple list: document name | category | date | download button
- No upload ability for clients
- Tap to view/download

---

## STEP 5 — Upload Flow

```ts
async function uploadDocument(file: DocumentPickerResult, metadata: DocumentMetadata) {
  // 1. Generate storage path
  const timestamp = Date.now()
  const storagePath = `${metadata.entityType}/${metadata.entityId}/${timestamp}_${file.name}`

  // 2. Upload to Supabase Storage (documents bucket — private)
  const { data: upload, error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file.blob, {
      contentType: file.mimeType,
      upsert: false
    })

  if (uploadError) throw uploadError

  // 3. Insert document record
  const { data, error } = await supabase.from('documents').insert({
    entity_type: metadata.entityType,
    entity_id: metadata.entityId,
    document_name: metadata.name,
    original_filename: file.name,
    storage_path: storagePath,
    file_type: getFileExtension(file.name),
    file_size_bytes: file.size,
    mime_type: file.mimeType,
    category: metadata.category,
    date_of_document: metadata.dateOfDocument,
    expiry_date: metadata.expiryDate,
    document_number: metadata.documentNumber,
    issued_by: metadata.issuedBy,
    description: metadata.description,
    client_visible: metadata.clientVisible,
    uploaded_by: currentUserId,
  })

  if (error) throw error
  return data
}
```

---

## STEP 6 — View & Export Flow

```ts
async function viewDocument(document: Document) {
  // 1. Log access
  await supabase.from('document_access_log').insert({
    document_id: document.id,
    accessed_by: currentUserId,
    action: 'view'
  })

  // 2. Get signed URL (60 min expiry)
  const { data } = await supabase.storage
    .from('documents')
    .createSignedUrl(document.storage_path, 3600)

  // 3. Open document
  if (document.file_type === 'pdf') {
    await Linking.openURL(data.signedUrl)
  } else if (['jpg','png'].includes(document.file_type)) {
    // Show in image viewer modal
    openImageViewer(data.signedUrl)
  } else {
    // Download and open with device default app
    const localPath = await downloadFile(data.signedUrl, document.original_filename)
    await Sharing.shareAsync(localPath)
  }
}

async function exportDocument(document: Document) {
  // Log as download
  await supabase.from('document_access_log').insert({
    document_id: document.id,
    accessed_by: currentUserId,
    action: 'download'
  })

  const { data } = await supabase.storage
    .from('documents')
    .createSignedUrl(document.storage_path, 3600)

  // Use expo-sharing to share/export
  const localPath = await FileSystem.downloadAsync(
    data.signedUrl,
    FileSystem.documentDirectory + document.original_filename
  )
  await Sharing.shareAsync(localPath.uri)
}
```

---

## STEP 7 — Expiry Alerts on Dashboard

On the admin dashboard, add an "Expiring Documents" widget:
- Query: `SELECT * FROM documents WHERE expiry_date BETWEEN NOW() AND NOW() + INTERVAL '60 days' ORDER BY expiry_date ASC`
- Show max 5 items, "View all" link
- Each item: dog/entity name | document name | "Expires in X days" (red/orange)

---

## STEP 8 — Required Packages

Install if not already installed:
```bash
npx expo install expo-document-picker expo-file-system expo-sharing
```

---

## Testing Checklist

- [ ] Upload a PDF to a dog → appears in dog's Documents tab
- [ ] Upload an image → shows thumbnail preview
- [ ] Document name auto-fills from filename, editable
- [ ] Category dropdown changes based on context (dog vs litter vs client)
- [ ] Date of document saved correctly (date on document, not upload date)
- [ ] Expiry date shows red badge when expired, orange when within 30 days
- [ ] "Share with Client" sets client_visible = true
- [ ] Client portal only shows documents marked client_visible
- [ ] Tapping a PDF opens it in device PDF reader
- [ ] Download/export logs to document_access_log
- [ ] Kennel Documents master screen shows all documents with filters
- [ ] Dashboard expiry widget shows upcoming expiring documents
- [ ] Delete document removes from Storage AND documents table
- [ ] Dog detail Documents tab visible
- [ ] Litter detail Documents tab visible
- [ ] Application detail Documents section visible
- [ ] Client profile Documents tab visible
- [ ] Training detail Documents section visible
