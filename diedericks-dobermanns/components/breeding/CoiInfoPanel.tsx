import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { COI_INFO_SECTIONS } from '@/lib/breeding/coi-info-content';

export interface CoiInfoPanelHandle {
  open: () => void;
  close: () => void;
}

export const CoiInfoPanel = forwardRef<CoiInfoPanelHandle>(function CoiInfoPanel(_, ref) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['90%'], []);

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.present(),
    close: () => sheetRef.current?.dismiss(),
  }));

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: '#1C1A0E' }}
      handleIndicatorStyle={{ backgroundColor: '#C4A35A' }}
    >
      <BottomSheetScrollView className="px-5 pb-12">
        <Typography variant="subtitle" className="mb-4 text-gold">
          COI Reference
        </Typography>
        {COI_INFO_SECTIONS.map((section) => (
          <View key={section.title} className="mb-6">
            <Typography variant="label" className="mb-2 text-gold">
              {section.title}
            </Typography>
            <Typography variant="caption" className="leading-5 text-ink">
              {section.body}
            </Typography>
          </View>
        ))}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
