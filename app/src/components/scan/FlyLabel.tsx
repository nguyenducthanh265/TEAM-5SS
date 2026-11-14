// Khoảnh khắc nhận diện: nhãn nhóm bay lên trong ~250 ms rồi mờ dần. Chỉ đổi transform/opacity.
import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { textOn } from '@/components/scan/labels';

type Props = {
  label: string;
  color: string;
};

const RISE_MS = 250;
const HOLD_MS = 900;
const FADE_MS = 220;

/** Chạy một lần khi mount. Muốn chạy lại: đổi `key` ở nơi gọi. */
export function FlyLabel({ label, color }: Props) {
  const rise = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    rise.value = withTiming(1, { duration: RISE_MS, easing: Easing.out(Easing.cubic) });
    fade.value = withDelay(RISE_MS + HOLD_MS, withTiming(0, { duration: FADE_MS }));
  }, [rise, fade]);

  const style = useAnimatedStyle(() => ({
    opacity: rise.value * fade.value,
    transform: [{ translateY: (1 - rise.value) * 48 }, { scale: 0.85 + 0.15 * rise.value }],
  }));

  const fg = textOn(color);
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, style]}>
      <Animated.View style={[styles.pill, { backgroundColor: color }]}>
        <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  pill: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, maxWidth: 300 },
  label: { fontSize: 20, fontWeight: '800' },
});
