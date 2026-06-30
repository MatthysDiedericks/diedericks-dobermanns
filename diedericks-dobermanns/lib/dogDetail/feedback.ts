import { Alert } from 'react-native';

export function showSaved(message = 'Record saved successfully.') {
  Alert.alert('Saved', message);
}

export function showError(message = 'Could not save. Please try again.') {
  Alert.alert('Error', message);
}

export function parseDateInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return trimmed.slice(0, 10);
}
