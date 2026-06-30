import { Redirect } from 'expo-router';

/** Legacy auth route — redirects to the public login screen. */
export default function LegacyLoginRedirect() {
  return <Redirect href="/(public)/login" />;
}
