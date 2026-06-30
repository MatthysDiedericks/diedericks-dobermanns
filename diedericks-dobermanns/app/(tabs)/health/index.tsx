import { HealthHubScreen } from '@/components/health/HealthHubScreen';

export default function HealthHubRoute() {
  return (
    <HealthHubScreen
      settingsRoute="/(admin)/health/settings"
      geneticsRoute="/(tabs)/genetics"
    />
  );
}
