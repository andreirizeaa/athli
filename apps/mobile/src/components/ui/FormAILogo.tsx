import { Image } from 'expo-image';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

interface FormAILogoProps {
  containerStyle?: any;
  iconSize?: number;
  textStyle?: any;
  variant?: 'default' | 'white';
}

export function FormAILogo({
  containerStyle,
  iconSize = 40,
  textStyle,
  variant = 'default',
}: FormAILogoProps) {
  const iconSource =
    variant === 'white'
      ? require('../../../assets/white-dumbell.svg')
      : require('../../../assets/dumbel.svg');

  return (
    <View style={[styles.container, containerStyle]}>
      <Image
        source={iconSource}
        style={{ width: iconSize, height: iconSize }}
        contentFit="contain"
      />
      <Text style={[styles.title, textStyle]}>Form AI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'left',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
});
