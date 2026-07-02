import type { TextStyle, ViewStyle } from 'react-native';

import { Colors } from '@/constants/colors';

/**
 * Shared bottom-tab navigation styling used across the public, portal and admin
 * navigators. Deep olive/dark-gold bar with gold text and a gold top border.
 * Spread into each navigator's `screenOptions`.
 */
export const tabBarTheme = {
  headerShown: false,
  tabBarActiveTintColor: Colors.gold,
  tabBarInactiveTintColor: Colors.goldMuted,
  tabBarStyle: {
    backgroundColor: Colors.background,
    borderTopColor: Colors.gold,
    borderTopWidth: 1,
  } as ViewStyle,
  tabBarLabelStyle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,
} as const;
