import * as Notifications from 'expo-notifications';

import { addDays } from '@/lib/heats/calculations';

const TEMP_REMINDER_PREFIX = 'whelp-temp-';

/**
 * Daily local reminder to take temperatures from 7 days before earliest whelp.
 * Reuses Expo Notifications — no new notification service.
 */
export async function scheduleWhelpingTempReminders(input: {
  cycleId: string;
  dogName: string;
  earliestWhelpDate: string | null | undefined;
}): Promise<void> {
  if (!input.earliestWhelpDate) return;

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing
      .filter((n) => n.identifier.startsWith(`${TEMP_REMINDER_PREFIX}${input.cycleId}`))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  const start = addDays(input.earliestWhelpDate, -7);
  const startMs = new Date(`${start}T08:00:00`).getTime();
  const endMs = new Date(`${input.earliestWhelpDate}T20:00:00`).getTime();
  if (endMs < Date.now()) return;

  let day = Math.max(startMs, Date.now() + 60_000);
  let i = 0;
  while (day <= endMs && i < 14) {
    const when = new Date(day);
    await Notifications.scheduleNotificationAsync({
      identifier: `${TEMP_REMINDER_PREFIX}${input.cycleId}-${i}`,
      content: {
        title: 'Whelping temperature check',
        body: `Time to log ${input.dogName}'s rectal temperature (°C).`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
      },
    });
    day += 86_400_000;
    i += 1;
  }
}
