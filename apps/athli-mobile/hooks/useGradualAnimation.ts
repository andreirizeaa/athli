import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';

export const useGradualAnimation = () => {
  const height = useSharedValue(0);
  const isOpening = useSharedValue(false);

  useKeyboardHandler(
    {
      onMove: (e) => {
        'worklet';

        const nextHeight = Math.max(e.height, 0);

        // Keyboard just started opening - animate smoothly
        if (height.value === 0 && nextHeight > 0 && !isOpening.value) {
          isOpening.value = true;

          height.value = withTiming(nextHeight, {
            duration: 300,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          });
          return;
        }

        // During movement, directly update for smooth real-time tracking
        height.value = nextHeight;
      },

      onEnd: (e) => {
        'worklet';

        // Keyboard fully closed - animate smoothly
        if (e.height === 0) {
          isOpening.value = false;

          height.value = withTiming(0, {
            duration: 300,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          });
        }
      },
    },
    []
  );

  return { height };
};
