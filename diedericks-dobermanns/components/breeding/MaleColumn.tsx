import { FlatList, View } from 'react-native';

import { FemaleCard } from '@/components/breeding/FemaleCard';
import { MaleCard } from '@/components/breeding/MaleCard';
import { COLUMN_MIN_WIDTH } from '@/lib/breeding/constants';
import type { CardLayout, FemaleAllocation, PairingWithCoi, PlannerDog } from '@/types/breeding';

interface MaleColumnProps {
  male: PlannerDog;
  columnWidth: number;
  columnX: number;
  allocations: FemaleAllocation[];
  isLockedFemale: (dog: PlannerDog) => boolean;
  onFemalePress: (female: PlannerDog, pairing?: PairingWithCoi) => void;
  onRegisterLayout: (key: string, layout: CardLayout) => void;
}

export function MaleColumn({
  male,
  columnWidth,
  columnX,
  allocations,
  isLockedFemale,
  onFemalePress,
  onRegisterLayout,
}: MaleColumnProps) {
  const width = Math.max(columnWidth, COLUMN_MIN_WIDTH);

  return (
    <View style={{ width, paddingHorizontal: 8 }}>
      <MaleCard
        male={male}
        onLayout={(layout) =>
          onRegisterLayout(`sire-${male.id}`, {
            ...layout,
            x: columnX + layout.x,
            y: layout.y,
          })
        }
      />
      <FlatList
        data={allocations}
        scrollEnabled={false}
        keyExtractor={(item) => item.pairing.id}
        renderItem={({ item }) => (
          <FemaleCard
            female={item.female}
            pairing={item.pairing}
            locked={isLockedFemale(item.female)}
            onPress={() => onFemalePress(item.female, item.pairing)}
            onLayout={(layout) =>
              onRegisterLayout(`dam-${item.female.id}`, {
                ...layout,
                x: columnX + layout.x,
                y: layout.y,
              })
            }
          />
        )}
        ListEmptyComponent={null}
      />
    </View>
  );
}
