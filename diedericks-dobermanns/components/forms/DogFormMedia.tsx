import { View } from 'react-native';

import { MediaUploader, type UploaderValue } from '@/components/forms/MediaUploader';
import { Typography } from '@/components/ui/Typography';

export function DogFormMedia({
  folder,
  photos,
  videos,
  onPhotos,
  onVideos,
}: {
  folder: string;
  photos: UploaderValue[];
  videos: UploaderValue[];
  onPhotos: (next: UploaderValue[]) => void;
  onVideos: (next: UploaderValue[]) => void;
}) {
  return (
    <>
      <Typography variant="label" className="mb-2 mt-2">
        Photos (up to 20 · first is the cover)
      </Typography>
      <View className="mb-4">
        <MediaUploader
          value={photos}
          onChange={onPhotos}
          bucket="dog-media"
          folder={folder}
          kinds={['image']}
          max={20}
        />
      </View>
      <Typography variant="label" className="mb-2 mt-2">
        Videos (up to 10)
      </Typography>
      <View className="mb-4">
        <MediaUploader
          value={videos}
          onChange={onVideos}
          bucket="dog-media"
          folder={folder}
          kinds={['video']}
          max={10}
        />
      </View>
    </>
  );
}
