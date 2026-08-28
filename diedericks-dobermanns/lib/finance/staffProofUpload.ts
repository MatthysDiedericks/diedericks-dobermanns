import * as ImagePicker from "expo-image-picker";

import { uploadFile } from "@/lib/storage";
import { staffProofOwnerScope } from "@/lib/finance/proofSource";
import { useAuthStore } from "@/stores/authStore";
import { requireSupabase } from "@/lib/supabase";

export type PickedStaffProof = {
  uri: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
};

export async function pickStaffProof(
  source: "library" | "camera",
): Promise<PickedStaffProof | null> {
  const perm =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error(
      source === "camera"
        ? "Camera permission is needed to photograph a proof."
        : "Photo library permission is needed to attach a WhatsApp screenshot.",
    );
  }
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.9,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.9,
        });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const fileName = asset.fileName ?? `whatsapp-proof-${Date.now()}.jpg`;
  return {
    uri: asset.uri,
    fileName,
    mimeType: asset.mimeType ?? "image/jpeg",
    sizeBytes: asset.fileSize,
  };
}

/** Same documents path the portal uses. Labels the row as staff-provided. */
export async function uploadStaffPaymentProof(input: {
  proof: PickedStaffProof;
  invoiceId: string;
  invoiceNumber: string;
  clientId: string | null;
  quoteId?: string | null;
}): Promise<{ documentId: string; storagePath: string }> {
  const actorId = useAuthStore.getState().profile?.id;
  if (!actorId) throw new Error("Sign in to attach a proof.");

  const scope = staffProofOwnerScope(input.clientId, input.invoiceId);
  const uploaded = await uploadFile({
    bucket: "documents",
    path: `${scope}/proof.jpg`,
    uri: input.proof.uri,
    fileName: input.proof.fileName,
    contentType: input.proof.mimeType,
    sizeBytes: input.proof.sizeBytes,
  });
  if (uploaded.error || !uploaded.path) {
    throw new Error(uploaded.error ?? "Could not store the proof.");
  }

  const supabase = requireSupabase();
  const entityId = input.clientId ?? actorId;
  const { data, error } = await supabase
    .from("documents")
    .insert({
      entity_type: input.clientId ? "client" : "invoice",
      entity_id: entityId,
      document_name: `Proof of payment — ${input.invoiceNumber}`,
      original_filename: input.proof.fileName,
      storage_path: uploaded.path,
      file_type: uploaded.path.split(".").pop() ?? "jpg",
      category: "proof_of_payment",
      description: "Added by staff",
      client_visible: false,
      is_public: false,
      uploaded_by: actorId,
      file_size_bytes: input.proof.sizeBytes ?? null,
      mime_type: "image/jpeg",
      related_quote_id: input.quoteId ?? null,
      related_invoice_id: input.invoiceId,
      review_status: "verified",
      provided_by: "staff",
    } as never)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Proof was stored but the document row was not created.");
  return { documentId: data.id, storagePath: uploaded.path };
}

/** Camera or library → same documents path the portal uses. */
export async function pickAndStoreStaffProof(input: {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string | null;
  quoteId?: string | null;
  source: "library" | "camera";
}): Promise<{ documentId: string; storagePath: string; fileName: string } | null> {
  const proof = await pickStaffProof(input.source);
  if (!proof) return null;
  const uploaded = await uploadStaffPaymentProof({
    proof,
    invoiceId: input.invoiceId,
    invoiceNumber: input.invoiceNumber,
    clientId: input.clientId,
    quoteId: input.quoteId,
  });
  return { ...uploaded, fileName: proof.fileName };
}
