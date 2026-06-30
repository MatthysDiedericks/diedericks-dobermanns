import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { TodoItemWithLinks } from '@/types/kennel';
import { isDueToday, isOverdue } from '@/lib/kennel/formatters';

export function TodoWidget({
  todos,
  onComplete,
}: {
  todos: TodoItemWithLinks[];
  onComplete: (id: string) => void;
}) {
  const router = useRouter();
  const todayTodos = todos.filter((t) => t.due_date && (isOverdue(t.due_date) || isDueToday(t.due_date)));

  return (
    <SurfaceCard title="To-Do (today / overdue)" badge={todayTodos.length} badgeTone="gold">
      {todayTodos.length === 0 ? (
        <Typography variant="caption" className="text-subtle">Nothing due today.</Typography>
      ) : (
        todayTodos.map((t) => {
          const overdue = t.due_date && isOverdue(t.due_date);
          return (
            <View key={t.id} className="flex-row items-center border-b border-gold/10 py-3">
              <Pressable onPress={() => onComplete(t.id)} className="mr-3 p-1">
                <Ionicons name="square-outline" size={20} color={Colors.gold} />
              </Pressable>
              <Pressable
                onPress={() => router.push('/(tabs)/calendar/index' as never)}
                className="flex-1"
              >
                <Typography variant="body" className={overdue ? 'text-danger' : 'text-amber-400'}>
                  {t.title}
                </Typography>
                {t.dog_name ? (
                  <Typography variant="caption" className="text-subtle">{t.dog_name}</Typography>
                ) : null}
              </Pressable>
            </View>
          );
        })
      )}
    </SurfaceCard>
  );
}
