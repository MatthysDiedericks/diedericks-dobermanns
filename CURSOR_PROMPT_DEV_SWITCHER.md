# CURSOR PROMPT — DEV SWITCHER (Development Tool)

## Context

App: Diedericks Dobermanns
Stack: React Native, Expo SDK 56, TypeScript strict, Expo Router, NativeWind
Supabase: nlmwxodvquwbjinhhbmr
Brand: Background #111008 | Surface #1C1A0E | Gold #C4A35A | Text #F5F0E8

## What to Build

A floating development switcher that appears ONLY when `__DEV__` is true (i.e., during local development — it will never appear in production builds). It lets the developer instantly jump between any area of the app without logging in and out repeatedly.

It should look like a small draggable pill at the bottom of the screen. When tapped, it expands to show navigation shortcuts.

---

## TASK 1 — Create the DevSwitcher Component

Create: `components/dev/DevSwitcher.tsx`

```typescript
/**
 * DevSwitcher — development-only floating navigation tool.
 * Renders ONLY when __DEV__ is true. Never ships to production.
 *
 * Tap the pill to expand. Tap any button to navigate instantly.
 * Tap the pill again to collapse.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

// Only import and render in development mode
if (!__DEV__) {
  // Export a no-op component in production — tree-shaken away by Metro
  export function DevSwitcher() { return null; }
} else {
  const SECTIONS = [
    {
      label: '🌐 Public',
      color: '#4A90D9',
      routes: [
        { label: 'Home', href: '/(public)' },
        { label: 'Our Dogs', href: '/(public)/dogs' },
        { label: 'Puppies', href: '/(public)/puppies' },
        { label: 'Gallery', href: '/(public)/gallery' },
        { label: 'Litters', href: '/(public)/litters' },
        { label: 'Contact', href: '/(public)/contact' },
        { label: 'Apply', href: '/(public)/apply' },
        { label: 'Login', href: '/(public)/login' },
      ],
    },
    {
      label: '👤 Client Portal',
      color: '#27AE60',
      routes: [
        { label: 'Dashboard', href: '/(portal)/dashboard' },
        { label: 'Reservation', href: '/(portal)/reservation' },
        { label: 'Training', href: '/(portal)/training' },
        { label: 'Videos', href: '/(portal)/training/videos' },
        { label: 'Documents', href: '/(portal)/documents' },
        { label: 'Messages', href: '/(portal)/messages' },
        { label: 'Profile', href: '/(portal)/profile' },
      ],
    },
    {
      label: '⚙️ Admin',
      color: '#C4A35A',
      routes: [
        { label: 'Dashboard', href: '/(admin)/dashboard' },
        { label: 'Dogs', href: '/(admin)/dogs' },
        { label: 'Litters', href: '/(admin)/litters' },
        { label: 'Breeding', href: '/(admin)/breeding' },
        { label: 'Waiting List', href: '/(admin)/waiting-list' },
        { label: 'Applications', href: '/(admin)/applications' },
        { label: 'Clients', href: '/(admin)/clients' },
        { label: 'Training', href: '/(admin)/training' },
        { label: 'Finance', href: '/(admin)/finance' },
        { label: 'Contacts', href: '/(tabs)/contacts' },
        { label: 'Health', href: '/(tabs)/health' },
        { label: 'Calendar', href: '/(tabs)/calendar' },
        { label: 'Documents', href: '/(tabs)/documents' },
        { label: 'Settings', href: '/(tabs)/settings' },
      ],
    },
    {
      label: '🏋️ Trainer',
      color: '#9B59B6',
      routes: [
        { label: 'My Sessions', href: '/(trainer)/bookings' },
        { label: 'My Dogs', href: '/(trainer)/dogs' },
        { label: 'Profile', href: '/(trainer)/profile' },
      ],
    },
  ];

  export function DevSwitcher() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [activeSection, setActiveSection] = useState(0);

    return (
      <View
        style={{
          position: 'absolute',
          bottom: 90,
          right: 12,
          zIndex: 9999,
          alignItems: 'flex-end',
        }}
        pointerEvents="box-none"
      >
        {open && (
          <View
            style={{
              backgroundColor: '#1C1A0E',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#C4A35A',
              marginBottom: 8,
              width: 220,
              maxHeight: 420,
              overflow: 'hidden',
            }}
          >
            {/* Section tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ borderBottomWidth: 1, borderColor: '#333' }}
              contentContainerStyle={{ flexDirection: 'row', padding: 6, gap: 6 }}
            >
              {SECTIONS.map((s, i) => (
                <Pressable
                  key={s.label}
                  onPress={() => setActiveSection(i)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: activeSection === i ? s.color : 'transparent',
                  }}
                >
                  <Text style={{ color: activeSection === i ? '#000' : '#888', fontSize: 11, fontWeight: '600' }}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Route buttons */}
            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ padding: 6, gap: 2 }}>
              {SECTIONS[activeSection].routes.map((r) => (
                <Pressable
                  key={r.href}
                  onPress={() => {
                    setOpen(false);
                    router.push(r.href as never);
                  }}
                  style={({ pressed }) => ({
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 6,
                    backgroundColor: pressed ? '#2A2A1A' : 'transparent',
                  })}
                >
                  <Text style={{ color: '#F5F0E8', fontSize: 13 }}>{r.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Toggle pill */}
        <Pressable
          onPress={() => setOpen((v) => !v)}
          style={{
            backgroundColor: open ? '#C4A35A' : '#1C1A0E',
            borderWidth: 1,
            borderColor: '#C4A35A',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: open ? '#000' : '#C4A35A', fontSize: 12, fontWeight: '700' }}>
            {open ? '✕ Close' : '🛠 Dev'}
          </Text>
        </Pressable>
      </View>
    );
  }
}
```

---

## TASK 2 — Mount the DevSwitcher in the Root Layout

Open `app/_layout.tsx`. Find where the main Stack is returned and add `<DevSwitcher />` as an overlay inside the GestureHandlerRootView:

```typescript
import { DevSwitcher } from '@/components/dev/DevSwitcher';

// Inside the return statement, after <Stack> and before </GestureHandlerRootView>:
{__DEV__ && <DevSwitcher />}
```

The full return should look like:

```typescript
return (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <BottomSheetModalProvider>
        <AuthNavigationSync />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(public)" />
          <Stack.Screen name="(portal)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="(trainer)" />
          <Stack.Screen name="auth" />
        </Stack>
        <StatusBar style="light" />
        {__DEV__ && <DevSwitcher />}
      </BottomSheetModalProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);
```

---

## TASK 3 — Add Quick Auth Status Indicator (Optional but useful)

In `components/dev/DevSwitcher.tsx`, import `useAuthStore` and show the current user's role at the top of the expanded panel:

```typescript
import { useAuthStore } from '@/stores/authStore';

// Inside the open panel, at the very top before section tabs:
const profile = useAuthStore((s) => s.profile);

// Add this view at the top of the expanded panel:
<View style={{ padding: 8, borderBottomWidth: 1, borderColor: '#333' }}>
  <Text style={{ color: '#C4A35A', fontSize: 11, fontWeight: '700' }}>
    {profile ? `Logged in as: ${profile.role}` : 'Not logged in (public)'}
  </Text>
  {profile && (
    <Text style={{ color: '#888', fontSize: 10 }} numberOfLines={1}>
      {profile.email ?? profile.full_name}
    </Text>
  )}
</View>
```

---

## CRITICAL WARNINGS

- The DevSwitcher MUST be completely excluded from production. The `__DEV__` guard handles this — Metro strips dead code.
- Do NOT add any `console.log` that outputs session tokens or user PII in the DevSwitcher
- The component must not affect layout, z-index, or touch targets of any production UI element
- Keep the file under 300 lines

---

## Testing Checklist

- [ ] `npx expo start --web` → gold "🛠 Dev" pill visible bottom-right
- [ ] Tap pill → expands showing Public / Client Portal / Admin / Trainer tabs
- [ ] Tap a route → navigates immediately without closing app
- [ ] Current role shown at top of expanded panel
- [ ] Run `eas build --profile production` → DevSwitcher is NOT visible in the production build
- [ ] `npx tsc --noEmit` passes with zero errors
