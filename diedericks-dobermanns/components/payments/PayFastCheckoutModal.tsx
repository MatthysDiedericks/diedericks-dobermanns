import { Modal, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';

interface PayFastCheckoutModalProps {
  visible: boolean;
  html: string | null;
  onClose: () => void;
}

/** Renders auto-submit PayFast HTML inside a WebView modal. */
export function PayFastCheckoutModal({ visible, html, onClose }: PayFastCheckoutModalProps) {
  if (!html) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black pt-12">
        <View className="flex-row items-center justify-between px-4 pb-3">
          <Typography variant="subtitle">Secure Payment</Typography>
          <Button label="Close" variant="secondary" onPress={onClose} />
        </View>
        <WebView
          source={{ html }}
          originWhitelist={['*']}
          startInLoadingState
          onNavigationStateChange={(nav) => {
            if (nav.url.includes('/payment/success')) onClose();
          }}
        />
      </View>
    </Modal>
  );
}
