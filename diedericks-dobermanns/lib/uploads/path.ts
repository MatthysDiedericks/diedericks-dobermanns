const UNSAFE = /[^a-zA-Z0-9/_-]+/g;

/** Folder prefix only. Never pass a user filename. */
export function ownerScope(raw: string): string {
  return raw
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .map((part) => part.replace(UNSAFE, "-"))
    .join("/");
}

export function newObjectId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** `{owner_scope}/{uuid}.{ext}` — user-supplied names never appear. */
export function storagePathFor(scope: string, ext: string): string {
  const folder = ownerScope(scope);
  const cleanExt = ext.replace(/^\./, "").toLowerCase();
  if (!folder) throw new Error("Upload folder is missing.");
  return `${folder}/${newObjectId()}.${cleanExt}`;
}
