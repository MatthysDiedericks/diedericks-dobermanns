import { Redirect } from 'expo-router';

/** Old bookmark — waiting list is no longer a portal page. */
export default function PortalWaitlistScreen() {
  return <Redirect href="/(portal)/dashboard" />;
}
