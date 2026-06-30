import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useTodos } from '@/hooks/useTodos';
import { formatKennelDate, isDueToday, isOverdue } from '@/lib/kennel/formatters';
import type { TodoItemWithLinks } from '@/types/kennel';

export default function TodosScreen() {
  const { todos, loading, error, completeTodo, addTodo } = useTodos();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');

  const overdue = todos.filter((i) => isOverdue(i.due_date));
  const today = todos.filter((i) => isDueToday(i.due_date));
  const upcoming = todos.filter((i) => !isOverdue(i.due_date) && !isDueToday(i.due_date));

  const Section = ({ label, rows, tone }: { label: string; rows: TodoItemWithLinks[]; tone?: string }) =>
    rows.length > 0 ? (
      <View className="mb-6">
        <Typography variant="label" className={`mb-2 ${tone ?? ''}`}>{label}</Typography>
        {rows.map((t) => (
          <Card key={t.id} className="mb-2 flex-row items-center">
            <Pressable onPress={() => completeTodo(t.id)} className="mr-3 border border-gold/40 px-2 py-1 rounded">
              <Typography variant="caption">✓</Typography>
            </Pressable>
            <View className="flex-1">
              <Typography variant="subtitle">{t.title}</Typography>
              <Typography variant="caption">{formatKennelDate(t.due_date)} · {t.category}</Typography>
              {t.litter_label ? <Typography variant="caption">{t.litter_label}</Typography> : null}
            </View>
            <Badge label={t.priority} tone="neutral" />
          </Card>
        ))}
      </View>
    ) : null;

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Kennel" title="To-Do Items" back={false} />
      <View className="px-6 mb-4 gap-2">
        <Input value={title} onChangeText={setTitle} placeholder="Task title" />
        <Input value={dueDate} onChangeText={setDueDate} placeholder="Due date YYYY-MM-DD" />
        <Button label="Add task" onPress={() => addTodo(title, dueDate || null)} fullWidth />
      </View>
      <ScrollView className="px-6 pb-12">
        {error ? <Typography variant="body" className="text-danger">{error}</Typography> : null}
        {loading ? <Typography variant="body">Loading…</Typography> : null}
        {!loading && todos.length === 0 ? (
          <EmptyState title="All complete" message="All tasks complete. Well done." />
        ) : (
          <>
            <Section label="OVERDUE" rows={overdue} tone="text-danger" />
            <Section label="TODAY" rows={today} tone="text-gold" />
            <Section label="UPCOMING" rows={upcoming} />
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
