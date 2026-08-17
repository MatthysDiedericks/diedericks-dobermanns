import Constants from 'expo-constants';

/** Version + build the error record must name. Carried through the offline queue in `detail`. */
export function appErrorMeta(screen?: string | null): {
  screen: string | null;
  app_version: string;
  build: string;
} {
  const expo = Constants.expoConfig;
  const build =
    Constants.nativeBuildVersion ??
    expo?.ios?.buildNumber ??
    expo?.android?.versionCode?.toString() ??
    '1';
  return {
    screen: screen?.slice(0, 200) ?? null,
    app_version: expo?.version ?? Constants.nativeAppVersion ?? '1.0.0',
    build: String(build),
  };
}
