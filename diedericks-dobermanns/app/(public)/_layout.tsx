import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { tabBarTheme } from '@/constants/navTheme';

export { ErrorBoundary } from '@/components/ui/RouteErrorBoundary';

/**
 * Public area bottom-tab navigation. Secondary routes (about, litters,
 * testimonials, faq, apply, dog detail) live in this navigator but are hidden
 * from the tab bar via `href: null` and reached through in-app links.
 */
export default function PublicLayout() {
  return (
    <Tabs screenOptions={tabBarTheme}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="dogs/index"
        options={{
          title: 'Our Dogs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="paw" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="puppies/index"
        options={{
          title: 'Puppies',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: 'Gallery',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="images" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="contact"
        options={{
          title: 'Contact',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mail" color={color} size={size} />
          ),
        }}
      />

      {/* Hidden routes — navigable via links, not shown in the tab bar. */}
      <Tabs.Screen name="about" options={{ href: null }} />
      <Tabs.Screen name="breeding-stock" options={{ href: null }} />
      <Tabs.Screen name="training-philosophy" options={{ href: null }} />
      <Tabs.Screen name="achievements" options={{ href: null }} />
      <Tabs.Screen name="litters/index" options={{ href: null }} />
      <Tabs.Screen name="litters/[id]" options={{ href: null }} />
      <Tabs.Screen name="testimonials" options={{ href: null }} />
      <Tabs.Screen name="faq" options={{ href: null }} />
      <Tabs.Screen name="terms" options={{ href: null }} />
      <Tabs.Screen name="terms-of-sale" options={{ href: null }} />
      <Tabs.Screen name="privacy" options={{ href: null }} />
      <Tabs.Screen name="apply" options={{ href: null }} />
      <Tabs.Screen name="dogs/[id]" options={{ href: null }} />
      <Tabs.Screen name="puppies/[id]" options={{ href: null }} />
      <Tabs.Screen
        name="login"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="forgot-password"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="reset-password"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
    </Tabs>
  );
}
