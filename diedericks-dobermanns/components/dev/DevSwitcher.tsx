/**
 * DevSwitcher — development-only floating navigation tool.
 * Renders ONLY when __DEV__ is true. Never ships to production.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useAuthStore } from '@/stores/authStore';

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
] as const;

function DevSwitcherPanel() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const email = useAuthStore((s) => s.session?.user.email);
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
      {open ? (
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
          <View style={{ padding: 8, borderBottomWidth: 1, borderColor: '#333' }}>
            <Text style={{ color: '#C4A35A', fontSize: 11, fontWeight: '700' }}>
              {profile ? `Logged in as: ${profile.role}` : 'Not logged in (public)'}
            </Text>
            {profile ? (
              <Text style={{ color: '#888', fontSize: 10 }} numberOfLines={1}>
                {email ?? profile.full_name ?? profile.id}
              </Text>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
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
                <Text
                  style={{
                    color: activeSection === i ? '#000' : '#888',
                    fontSize: 11,
                    fontWeight: '600',
                  }}
                >
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

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
      ) : null}

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

export function DevSwitcher() {
  if (!__DEV__) return null;
  return <DevSwitcherPanel />;
}
