import { useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';

const PAD_HEIGHT = 180;

interface SignaturePadProps {
  onConfirm: (base64Png: string) => void | Promise<void>;
  confirming?: boolean;
}

/**
 * Draw-to-sign canvas built from `react-native-svg` + the built-in
 * `PanResponder` — no native signature-pad module required, so this works in
 * Expo Go / the existing dev client without a new EAS build.
 */
export function SignaturePad({ onConfirm, confirming = false }: SignaturePadProps) {
  const svgRef = useRef<Svg>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const hasDrawing = paths.length > 0 || currentPath.length > 0;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(`M${locationX.toFixed(1)},${locationY.toFixed(1)}`);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => `${prev} L${locationX.toFixed(1)},${locationY.toFixed(1)}`);
      },
      onPanResponderRelease: () => {
        setCurrentPath((prev) => {
          if (prev) setPaths((p) => [...p, prev]);
          return '';
        });
      },
    }),
  ).current;

  function clear() {
    setPaths([]);
    setCurrentPath('');
  }

  function confirm() {
    if (!hasDrawing || !svgRef.current) return;
    svgRef.current.toDataURL((base64: string) => {
      void onConfirm(base64);
    });
  }

  return (
    <View>
      <Typography variant="caption" className="mb-2 text-silver">
        Sign in the box below
      </Typography>
      {/* PanResponder is a stable ref created once via useRef(...).current — the
          standard RN idiom for spreading panHandlers during render. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      <View
        {...panResponder.panHandlers}
        className="overflow-hidden rounded-xl border border-gold/30 bg-white"
        style={{ height: PAD_HEIGHT }}
      >
        <Svg ref={svgRef} width="100%" height={PAD_HEIGHT}>
          {paths.map((p, i) => (
            <Path key={i} d={p} stroke="#111008" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          ))}
          {currentPath ? (
            <Path d={currentPath} stroke="#111008" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          ) : null}
        </Svg>
      </View>
      <View className="mt-3 flex-row gap-3">
        <Button label="Clear" variant="secondary" size="sm" onPress={clear} disabled={!hasDrawing || confirming} />
        <Button
          label="Confirm Signature"
          size="sm"
          onPress={confirm}
          disabled={!hasDrawing}
          loading={confirming}
          className="flex-1"
        />
      </View>
    </View>
  );
}
