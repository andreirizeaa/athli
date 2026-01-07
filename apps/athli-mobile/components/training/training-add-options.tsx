import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated } from 'react-native';
import { PressableOpacity } from 'pressto';
import { Dumbbell, CalendarX } from 'lucide-react-native';

import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { typography, iconSizes } from '@/constants/typography';
import { PlatformIcon } from '@/components/platform-icon';

interface TrainingAddOptionsProps {
  isVisible: boolean;
  onCreateSessionPress: () => void;
  onOneOffSessionPress: () => void;
  onClose: () => void;
}

export function TrainingAddOptions({
  isVisible,
  onCreateSessionPress,
  onOneOffSessionPress,
  onClose,
}: TrainingAddOptionsProps) {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const [shouldRender, setShouldRender] = React.useState(isVisible);
  const fadeOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      fadeOpacity.setValue(0);
      Animated.timing(fadeOpacity, { toValue: 1, duration: 100, useNativeDriver: true }).start();
      return;
    }
    Animated.timing(fadeOpacity, { toValue: 0, duration: 100, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setShouldRender(false);
      }
    );
  }, [isVisible, fadeOpacity]);

  if (!shouldRender) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeOpacity }]}>
      <Pressable
        style={styles.darkOverlay}
        onPress={onClose}
      >
        <View style={styles.cardsContainer} pointerEvents="box-none">
          {/* Create a session Card */}
          <PressableOpacity
            style={[styles.card, { backgroundColor: themeColors.surface }]}
            onPress={() => {
              onCreateSessionPress();
            }}
          >
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                {t('training.addOptions.createSession')}
              </Text>
              <PlatformIcon
                sf="dumbbell.fill"
                IconComponent={Dumbbell}
                size={iconSizes.listIcons}
                color={themeColors.text}
              />
            </View>
          </PressableOpacity>

          {/* One-off session Card */}
          <PressableOpacity
            style={[styles.card, { backgroundColor: themeColors.surface }]}
            onPress={() => {
              onOneOffSessionPress();
            }}
          >
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                {t('training.addOptions.oneOffSession')}
              </Text>
              <PlatformIcon
                sf="calendar.badge.clock"
                IconComponent={CalendarX}
                size={iconSizes.listIcons}
                color={themeColors.text}
              />
            </View>
          </PressableOpacity>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  darkOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingBottom: 120,
    paddingRight: 16,
  },
  cardsContainer: {
    alignItems: 'flex-end',
  },
  card: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    ...typography.h6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});
