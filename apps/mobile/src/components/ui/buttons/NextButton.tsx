import React from 'react';
import { StyleSheet, Platform, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { appColors } from '../../../constants/appColorScheme';

interface NextButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function NextButton({ title, onPress, disabled = false, loading = false }: NextButtonProps) {
  const isButtonDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[styles.button, isButtonDisabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={isButtonDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 40,
    backgroundColor: '#000000',
    borderRadius: 36,
    height: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});
