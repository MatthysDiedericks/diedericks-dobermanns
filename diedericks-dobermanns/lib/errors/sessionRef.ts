/** One random id per app launch — retries by one person group as one incident. */
let sessionRef: string | null = null;

function randomRef(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getErrorSessionRef(): string {
  if (!sessionRef) sessionRef = randomRef();
  return sessionRef;
}
