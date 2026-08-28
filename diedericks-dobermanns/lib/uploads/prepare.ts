import {
  BAD_TYPE_MESSAGE,
  MAX_UPLOAD_BYTES,
  tooLargeMessage,
} from "./constants";
import { stripImageMetadata } from "./exif";
import { detectUploadKind, mimeForKind, storedExt } from "./magic";
import { storagePathFor } from "./path";

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

export interface PreparedUpload {
  bytes: Uint8Array;
  path: string;
  mime: string;
  ext: string;
  kind: ReturnType<typeof detectUploadKind>;
}

export function prepareUpload(
  bytes: Uint8Array,
  ownerScope: string,
  maxBytes = MAX_UPLOAD_BYTES,
): PreparedUpload {
  if (bytes.byteLength > maxBytes) {
    throw new UploadValidationError(tooLargeMessage(bytes.byteLength, maxBytes));
  }
  const kind = detectUploadKind(bytes);
  if (!kind || kind === "mp4" || kind === "mov" || kind === "m4v" || kind === "webm") {
    throw new UploadValidationError(BAD_TYPE_MESSAGE);
  }
  const ext = storedExt(kind);
  // HEIC/HEIF must be converted to JPEG before this runs — never store raw HEIC.
  if (ext === "heic" || ext === "heif") {
    throw new UploadValidationError(
      "iPhone photo format could not be read, please try again.",
    );
  }
  const stripped =
    ext === "pdf"
      ? bytes
      : stripImageMetadata(ext as "jpg" | "png" | "webp", bytes);
  if (stripped.byteLength > maxBytes) {
    throw new UploadValidationError(tooLargeMessage(stripped.byteLength, maxBytes));
  }
  return {
    bytes: stripped,
    path: storagePathFor(ownerScope, ext),
    mime: mimeForKind(kind),
    ext,
    kind,
  };
}
