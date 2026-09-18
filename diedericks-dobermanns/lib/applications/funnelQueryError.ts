/**
 * Classify a Postgres error from the application-step-events query.
 * Pure — no IO — so a permission miss is not logged as a product failure.
 */

export type FunnelQueryErrorKind = "missing" | "denied" | "other";

export function classifyFunnelQueryError(message: string): FunnelQueryErrorKind {
  const m = message.toLowerCase();
  const aboutTracking =
    m.includes("application_step_events") || m.includes("step_events");
  if (
    aboutTracking &&
    (m.includes("does not exist") ||
      m.includes("could not find") ||
      m.includes("schema cache") ||
      m.includes("42p01"))
  ) {
    return "missing";
  }
  if (m.includes("permission denied") || m.includes("42501")) {
    return "denied";
  }
  return "other";
}

export function funnelQueryErrorOutcome(message: string): {
  trackingReady: boolean;
  shouldLog: boolean;
} {
  const kind = classifyFunnelQueryError(message);
  if (kind === "missing") return { trackingReady: false, shouldLog: false };
  if (kind === "denied") return { trackingReady: true, shouldLog: false };
  return { trackingReady: true, shouldLog: true };
}
