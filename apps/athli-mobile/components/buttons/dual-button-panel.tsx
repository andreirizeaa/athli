import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { OutlinedButton } from './outlined-button';
import { FilledButton } from './filled-button';

type DualButtonPanelProps = {
  primaryLabel: string;
  secondaryLabel: string;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
  primaryDisabled?: boolean;
  secondaryDisabled?: boolean;
  style?: ViewStyle;
};

export const DualButtonPanel = ({
  primaryLabel,
  secondaryLabel,
  onPrimaryPress,
  onSecondaryPress,
  primaryDisabled = false,
  secondaryDisabled = false,
  style,
}: DualButtonPanelProps) => {
  return (
    <View style={[styles.container, style]}>
      <OutlinedButton label={secondaryLabel} onPress={onSecondaryPress} disabled={secondaryDisabled} />
      <FilledButton label={primaryLabel} onPress={onPrimaryPress} disabled={primaryDisabled} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
});

