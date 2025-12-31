// Fallback wrapper (web / missing native module)
import React from 'react';
import { View } from 'react-native';
import type { IWaveformRef } from './WaveformPlayer.native';

export type { IWaveformRef };

// Mock enums for fallback - these match the actual package enums
export enum PlayerState {
  idle = 'idle',
  playing = 'playing',
  paused = 'paused',
  stopped = 'stopped',
}

export enum FinishMode {
  loop = 'loop',
  pause = 'pause',
  stop = 'stop',
}

export const WaveformPlayer = React.forwardRef<IWaveformRef, any>(() => {
  return <View style={{ height: 32, flex: 1 }} />;
});

WaveformPlayer.displayName = 'WaveformPlayer';








