import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { isImageDocument, signedDocumentPreviewUrl } from '@/lib/documents/unlabelled';

type PreviewSource = {
  storage_path: string;
  file_type: string | null;
  mime_type: string | null;
};

export function DocumentPreviewThumb({ source }: { source: PreviewSource }) {
  const [url, setUrl] = useState<string | null>(null);
  const image = isImageDocument(source);

  useEffect(() => {
    let cancelled = false;
    void signedDocumentPreviewUrl(source.storage_path)
      .then((signed) => {
        if (!cancelled) setUrl(signed);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [source.storage_path]);

  async function open() {
    if (!url) return;
    await Linking.openURL(url);
  }

  return (
    <Pressable
      onPress={() => void open()}
      className="h-20 w-20 overflow-hidden rounded-sm bg-surface"
      accessibilityRole="button"
      accessibilityLabel="Preview document"
    >
      {image && url ? (
        <Image source={{ uri: url }} className="h-full w-full" resizeMode="cover" />
      ) : (
        <View className="h-full w-full items-center justify-center">
          <Ionicons name="document-text-outline" size={22} color={Colors.gold} />
          <Typography variant="caption" className="mt-1 text-gold">
            Open
          </Typography>
        </View>
      )}
    </Pressable>
  );
}
