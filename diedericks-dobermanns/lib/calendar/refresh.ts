type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribe to calendar refresh signals (e.g. after health or heat saves). */
export function subscribeCalendarRefresh(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyCalendarRefresh(): void {
  listeners.forEach((fn) => fn());
}
