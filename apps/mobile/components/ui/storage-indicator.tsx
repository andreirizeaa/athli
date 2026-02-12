import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HardDrive } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;
const BYTES_PER_GB = 1024 * 1024 * 1024;

function formatStorageUsed(bytes: number): string {
  if (bytes === 0) return '0 KB';

  const gb = bytes / BYTES_PER_GB;
  if (gb >= 1) {
    // Show GB with 1 decimal place
    return `${Math.round(gb * 10) / 10} GB`;
  }

  const mb = bytes / BYTES_PER_MB;
  if (mb >= 1) {
    // Show MB as whole number
    return `${Math.round(mb)} MB`;
  }

  const kb = bytes / BYTES_PER_KB;
  // Show KB as whole number
  return `${Math.round(kb)} KB`;
}

function getUsagePercentage(usedBytes: number, limitGb: number): number {
  if (limitGb <= 0) return 0;
  const usedGb = usedBytes / BYTES_PER_GB;
  return (usedGb / limitGb) * 100;
}

interface StorageIndicatorProps {
  usedBytes: number;
  limitGb: number;
}

export function StorageIndicator({ usedBytes, limitGb }: StorageIndicatorProps) {
  const { colors: themeColors } = useThemePreference();

  const percentage = getUsagePercentage(usedBytes, limitGb);

  // Determine color based on usage
  let textColor = themeColors.mutedText;
  if (percentage >= 100) {
    textColor = '#ef4444'; // red
  } else if (percentage >= 50) {
    textColor = '#f59e0b'; // amber
  }

  return (
    <View style={styles.container}>
      <HardDrive size={14} color={textColor} />
      <Text style={[styles.text, { color: textColor }]}>
        {formatStorageUsed(usedBytes)} / {limitGb} GB
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  text: {
    ...typography.p3,
    fontWeight: '500',
  },
});
