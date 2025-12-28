// Native-only waveform wrapper (safe import)
import React from 'react';
import {
  Waveform,
  type IWaveformRef,
  PlayerState,
  FinishMode,
} from '@simform_solutions/react-native-audio-waveform';
import type { ComponentProps } from 'react';

export type { IWaveformRef };
export { PlayerState, FinishMode };

type Props = Omit<ComponentProps<typeof Waveform>, 'ref'>;

export const WaveformPlayer = React.forwardRef<IWaveformRef, Props>((props, ref) => {
  return <Waveform ref={ref} {...props} />;
});

WaveformPlayer.displayName = 'WaveformPlayer';






