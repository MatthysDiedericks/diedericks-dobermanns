import { usePathname } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { submitIssueReport } from '@/lib/issues/submitIssueReport';

/** Discreet portal footer control — writes `issue_reports` with source=reported. */
export function ReportProblemLink() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [whatDoing, setWhatDoing] = useState('');
  const [whatHappened, setWhatHappened] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setBusy(true);
    const result = await submitIssueReport({
      title: whatDoing.trim() || 'Problem report',
      detail: `What I was doing:\n${whatDoing.trim()}\n\nWhat happened:\n${whatHappened.trim()}`,
      page_path: pathname ? `app://portal${pathname}` : 'app://portal',
    });
    setBusy(false);
    if (!result.ok) {
      Alert.alert('Could not send', result.error);
      return;
    }
    setOpen(false);
    setWhatDoing('');
    setWhatHappened('');
    Alert.alert('Thank you', 'We have logged this.');
  };

  return (
    <View>
      <Pressable onPress={() => setOpen(true)} className="items-center py-2">
        <Typography variant="caption" className="text-subtle underline">
          Report a problem
        </Typography>
      </Pressable>

      <Modal visible={open} onClose={() => setOpen(false)} title="Report a problem">
        <Typography variant="caption" className="mb-3 text-subtle">
          Tell us what you were doing and what went wrong. We capture the screen path
          automatically.
        </Typography>
        <Input
          label="What were you doing?"
          value={whatDoing}
          onChangeText={setWhatDoing}
          multiline
          numberOfLines={3}
          className="mb-3"
        />
        <Input
          label="What happened?"
          value={whatHappened}
          onChangeText={setWhatHappened}
          multiline
          numberOfLines={3}
          className="mb-4"
        />
        <Button label="Send report" onPress={() => void onSubmit()} loading={busy} fullWidth />
      </Modal>
    </View>
  );
}
