import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { useSharedValue, withTiming } from 'react-native-reanimated';

export const useGradualAnimation = () => {
  const height = useSharedValue(0);
  const isOpening = useSharedValue(false);

  useKeyboardHandler(
    {
      onMove: (e) => {
        'worklet';

        const nextHeight = Math.max(e.height, 0);

        // Keyboard just started opening
        if (height.value === 0 && nextHeight > 0 && !isOpening.value) {
          isOpening.value = true;

          height.value = withTiming(nextHeight, {
            duration: 200, // 👈 OPEN duration
          });
          return;
        }

        // Normal tracking (after initial open)
        height.value = nextHeight;
      },

      onEnd: (e) => {
        'worklet';

        // Keyboard fully closed
        if (e.height === 0) {
          isOpening.value = false;

          height.value = withTiming(0, {
            duration: 180, // 👈 CLOSE duration
          });
        }
      },
    },
    []
  );

  return { height };
};
