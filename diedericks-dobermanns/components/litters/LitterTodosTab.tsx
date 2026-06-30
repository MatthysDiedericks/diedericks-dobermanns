import { useState } from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { useLitterTodos } from '@/hooks/useLitterTodos';
import { formatKennelDate } from '@/lib/kennel/formatters';

export function LitterTodosTab({ litterId }: { litterId: string }) {
  const [showCompleted, setShowCompleted] = useState(true);
  const { litterTodos, puppyTodos, toggleComplete, addTodo, deleteTodo } = useLitterTodos(
    litterId,
    showCompleted,
  );
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');

  async function handleAdd() {
    if (!title.trim()) return;
    try {
      await addTodo({ title: title.trim(), due_date: dueDate || undefined, dog_id: null });
      setTitle('');
      setDueDate('');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    }
  }

  function TodoBlock({
    label,
    items,
  }: {
    label: string;
    items: typeof litterTodos;
  }) {
    return (
      <View className="mb-6">
        <Typography variant="label" className="mb-2 text-gold">
          {label}
        </Typography>
        {items.map((t) => (
          <View key={t.id} className="mb-2 flex-row items-start border-b border-gold/10 pb-2">
            <Switch value={t.completed} onValueChange={(v) => void toggleComplete(t.id, v)} />
            <View className="ml-2 flex-1">
              <Typography variant="body">{t.title}</Typography>
              {t.due_date ? (
                <Typography variant="caption" className="text-subtle">
                  Due {formatKennelDate(t.due_date)}
                </Typography>
              ) : null}
              {t.description ? (
                <Typography variant="caption" className="text-subtle">
                  {t.description}
                </Typography>
              ) : null}
            </View>
            <Pressable onPress={() => void deleteTodo(t.id)}>
              <Typography variant="caption" className="text-danger">
                Delete
              </Typography>
            </Pressable>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View className="pb-8">
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Switch value={showCompleted} onValueChange={setShowCompleted} />
          <Typography variant="caption">Show completed</Typography>
        </View>
      </View>
      <TodoBlock label="LITTER TO-DOS" items={litterTodos} />
      <TodoBlock label="PUPPY TO-DOS" items={puppyTodos} />
      <Typography variant="label" className="mb-2 text-gold">
        ADD TO-DO
      </Typography>
      <Input label="Title" value={title} onChangeText={setTitle} />
      <Input label="Due date (YYYY-MM-DD)" value={dueDate} onChangeText={setDueDate} />
      <Button label="Add To-Do Item" onPress={() => void handleAdd()} fullWidth />
    </View>
  );
}
