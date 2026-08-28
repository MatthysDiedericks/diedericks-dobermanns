import { detectUploadKind } from "@/lib/uploads/magic";
import { MAX_UPLOAD_BYTES } from "./constants";
import { convertUriToJpeg, looksLikeHeic } from "./heic";
import { prepareUpload, type PreparedUpload } from "./prepare";

/** Read a local URI, convert HEIC/HEIF → JPEG, then validate bytes. */
export async function prepareDocumentFromUri(input: {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
  ownerScope: string;
  maxBytes?: number;
}): Promise<PreparedUpload> {
  const maxBytes = input.maxBytes ?? MAX_UPLOAD_BYTES;
  let uri = input.uri;

  if (looksLikeHeic(input.name, input.mimeType)) {
    uri = await convertUriToJpeg(uri);
  }

  let bytes = new Uint8Array(await (await fetch(uri)).arrayBuffer());
  if (detectUploadKind(bytes) === "heic") {
    uri = await convertUriToJpeg(input.uri);
    bytes = new Uint8Array(await (await fetch(uri)).arrayBuffer());
  }

  return prepareUpload(bytes, input.ownerScope, maxBytes);
}
