import {
  Modal as RNModal,
  type ModalProps as RNModalProps,
  Pressable,
  View,
} from 'react-native';

import { Typography } from '@/components/ui/Typography';

interface ModalProps extends Omit<RNModalProps, 'children'> {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/** Centered dark modal sheet with a tappable scrim. */
export function Modal({ visible, onClose, title, children, ...rest }: ModalProps) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      {...rest}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/80 px-6"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl border border-gold/20 bg-black-rich p-6"
        >
          {title ? (
            <Typography variant="display" className="mb-4">
              {title}
            </Typography>
          ) : null}
          <View>{children}</View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
