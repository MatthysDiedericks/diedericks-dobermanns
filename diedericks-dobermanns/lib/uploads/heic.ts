import * as ImageManipulator from "expo-image-manipulator";

import { HEIC_CONVERT_FAILED_MESSAGE } from "@/lib/uploads/constants";

/**
 * iOS ImageManipulator can re-encode HEIC → JPEG. Never silently keep the
 * original HEIC — desktop Chrome cannot display it later.
 */
export function looksLikeHeic(name?: string | null, mime?: string | null): boolean {
  const n = (name ?? "").toLowerCase();
  const m = (mime ?? "").toLowerCase();
  return (
    n.endsWith(".heic") ||
    n.endsWith(".heif") ||
    m === "image/heic" ||
    m === "image/heif"
  );
}

export async function convertUriToJpeg(uri: string): Promise<string> {
  const mod = ImageManipulator as unknown as {
    SaveFormat: { JPEG: unknown };
    manipulateAsync?: (
      uri: string,
      actions: unknown[],
      opts: { compress: number; format: unknown },
    ) => Promise<{ uri: string }>;
    ImageManipulator?: {
      manipulate: (uri: string) => {
        renderAsync: () => Promise<{
          saveAsync: (opts: unknown) => Promise<{ uri: string }>;
        }>;
      };
    };
  };

  try {
    if (typeof mod.manipulateAsync === "function") {
      const result = await mod.manipulateAsync(uri, [], {
        compress: 0.9,
        format: mod.SaveFormat.JPEG,
      });
      return result.uri;
    }
    if (mod.ImageManipulator?.manipulate) {
      const rendered = await mod.ImageManipulator.manipulate(uri).renderAsync();
      const saved = await rendered.saveAsync({
        compress: 0.9,
        format: mod.SaveFormat.JPEG,
      });
      return saved.uri;
    }
  } catch {
    throw new Error(HEIC_CONVERT_FAILED_MESSAGE);
  }
  throw new Error(HEIC_CONVERT_FAILED_MESSAGE);
}
