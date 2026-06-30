import { ScrollView, type ScrollViewProps, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenContainerProps extends ScrollViewProps {
  /** Render as a scroll view (default) or a static view. */
  scroll?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Standard dark screen wrapper that respects safe-area insets. */
export function ScreenContainer({
  scroll = true,
  className,
  children,
  contentContainerStyle,
  ...rest
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  if (!scroll) {
    return (
      <View
        className={`flex-1 bg-black ${className ?? ''}`}
        style={{ paddingTop: insets.top }}
      >
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      className={`flex-1 bg-black ${className ?? ''}`}
      contentContainerStyle={[
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}
