/**
 * Optional Sentry initialisation. Set EXPO_PUBLIC_SENTRY_DSN in EAS secrets.
 * Install: npx expo install @sentry/react-native
 */
let initialised = false;

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn || initialised) return;

  try {
    // Loaded only when the package is installed and DSN is configured.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native') as {
      init: (opts: { dsn: string; enableInExpoDevelopment: boolean; tracesSampleRate: number }) => void;
    };
    Sentry.init({
      dsn,
      enableInExpoDevelopment: false,
      tracesSampleRate: 0.2,
    });
    initialised = true;
  } catch {
    if (__DEV__) {
      console.warn('[sentry] Install @sentry/react-native and set EXPO_PUBLIC_SENTRY_DSN to enable.');
    }
  }
}
