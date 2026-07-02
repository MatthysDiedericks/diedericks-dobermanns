import { Redirect } from 'expo-router';

/** Legacy tab route — forwards to the full waitlist module. */
export default function WaitingListRedirect() {
  return <Redirect href="/(admin)/waitlist/index" />;
}
