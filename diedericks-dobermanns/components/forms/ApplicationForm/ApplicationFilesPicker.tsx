import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import {
  pickApplicationFiles,
  type PickedApplicationFile,
} from '@/lib/uploads/applicationFiles';
import { MAX_APPLICATION_FILES } from '@/lib/uploads/constants';

export function ApplicationFilesPicker({
  files,
  onChange,
  error,
  onError,
}: {
  files: PickedApplicationFile[];
  onChange: (files: PickedApplicationFile[]) => void;
  error: string | null;
  onError: (message: string | null) => void;
}) {
  return (
    <View className="mt-6 rounded-xl border border-gold/20 bg-black-rich p-4">
      <Typography variant="subtitle" className="mb-2 text-gold">
        Supporting documents (optional)
      </Typography>
      <Typography variant="caption" className="mb-3">
        PDF, JPG, PNG, WEBP or HEIC. Max {MAX_APPLICATION_FILES} files, 10MB each. Filenames are
        not kept.
      </Typography>
      <Pressable
        onPress={() => {
          void pickApplicationFiles(files).then(({ files: next, error: err }) => {
            onChange(next);
            onError(err);
          });
        }}
        className="rounded-xl border border-gold/40 px-4 py-3"
      >
        <Typography variant="body" className="text-center text-gold">
          {files.length ? 'Add another file' : 'Choose files'}
        </Typography>
      </Pressable>
      {files.map((f) => (
        <Typography key={`${f.uri}-${f.name}`} variant="caption" className="mt-2">
          {f.name} · {(f.size / (1024 * 1024)).toFixed(1)} MB
        </Typography>
      ))}
      {error ? (
        <Typography variant="caption" className="mt-2 text-danger">
          {error}
        </Typography>
      ) : null}
    </View>
  );
}
