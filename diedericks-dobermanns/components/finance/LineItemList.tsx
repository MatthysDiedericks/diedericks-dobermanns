import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';

import { LineItemRow, type DraftLineItem } from './LineItemRow';

export function LineItemList({
  items,
  onUpdate,
  onRemove,
  onAdd,
  onAddCatalogue,
}: {
  items: DraftLineItem[];
  onUpdate: (key: string, patch: Partial<DraftLineItem>) => void;
  onRemove: (key: string) => void;
  onAdd: () => void;
  onAddCatalogue?: () => void;
}) {
  return (
    <>
      <Typography variant="label" className="mb-2 text-silver">Line items</Typography>
      <View className="gap-3">
        {items.map((it, idx) => (
          <LineItemRow
            key={it.key}
            item={it}
            index={idx}
            canRemove={items.length > 1}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))}
      </View>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {onAddCatalogue ? (
          <Button label="+ Catalogue" variant="outline" onPress={onAddCatalogue} />
        ) : null}
        <Button label="+ Free-text line" variant="outline" onPress={onAdd} />
      </View>
    </>
  );
}
