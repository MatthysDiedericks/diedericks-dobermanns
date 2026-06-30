import { Redirect } from 'expo-router';

export default function LegacyForgotPasswordRedirect() {
  return <Redirect href="/(public)/forgot-password" />;
}
