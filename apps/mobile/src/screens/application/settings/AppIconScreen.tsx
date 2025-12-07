import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  StatusBar,
  FlatList,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as DynamicAppIcon from 'expo-dynamic-app-icon';
import { hapticFeedback } from '../../../utils/haptic';
import i18n from '../../../utils/i18n';

interface AppIconScreenProps {
  onBack: () => void;
}

const ICONS = {
  default: require('../../../../assets/appIcons/formai-ios-icon.png'),
  black: require('../../../../assets/appIcons/form-ai-icon-black.png'),
  blue: require('../../../../assets/appIcons/form-ai-icon-blue.png'),
  green: require('../../../../assets/appIcons/form-ai-icon-green.png'),
  orange: require('../../../../assets/appIcons/form-ai-icon-orange.png'),
  pink: require('../../../../assets/appIcons/form-ai-icon-pink.png'),
  purple: require('../../../../assets/appIcons/form-ai-icon-purple.png'),
  red: require('../../../../assets/appIcons/form-ai-icon-red.png'),
  yellow: require('../../../../assets/appIcons/form-ai-icon-yellow.png'),
  'gradient-1': require('../../../../assets/appIcons/form-ai-icon-gradient-1.png'),
  'gradient-2': require('../../../../assets/appIcons/form-ai-icon-gradient-2.png'),
  'gradient-3': require('../../../../assets/appIcons/form-ai-icon-gradient-3.png'),
  'gradient-4': require('../../../../assets/appIcons/form-ai-icon-gradient-4.png'),
  'gradient-5': require('../../../../assets/appIcons/form-ai-icon-gradient-5.png'),
  'gradient-6': require('../../../../assets/appIcons/form-ai-icon-gradient-6.png'),
  'gradient-7': require('../../../../assets/appIcons/form-ai-icon-gradient-7.png'),
  'gradient-8': require('../../../../assets/appIcons/form-ai-icon-gradient-8.png'),
  'gradient-9': require('../../../../assets/appIcons/form-ai-icon-gradient-9.png'),
  'gradient-10': require('../../../../assets/appIcons/form-ai-icon-gradient-10.png'),
} as const;

type IconKey = keyof typeof ICONS;

export function AppIconScreen({ onBack }: AppIconScreenProps) {
  const [activeIcon, setActiveIcon] = useState<IconKey>('default');
  const [animatingIcon, setAnimatingIcon] = useState<IconKey | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const horizontalPadding = 20; // matches screens using 20 padding
  const gap = 20;
  const columns = 4;
  const itemSize = Math.floor(
    (screenWidth - horizontalPadding * 2 - gap * (columns - 1)) / columns
  );

  const iconEntries = useMemo(() => Object.entries(ICONS) as [IconKey, any][], []);
  const animationValues = useRef<Map<IconKey, { scale: Animated.Value; rotate: Animated.Value }>>(
    new Map()
  );

  // Initialize animation values for each icon
  iconEntries.forEach(([key]) => {
    if (!animationValues.current.has(key)) {
      animationValues.current.set(key, {
        scale: new Animated.Value(1),
        rotate: new Animated.Value(0),
      });
    }
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const current = await DynamicAppIcon.getAppIcon();
        if (!mounted) return;
        // getAppIconAsync may return null/undefined for default
        setActiveIcon((current === 'DEFAULT' ? 'default' : current || 'default') as IconKey);
      } catch {
        setActiveIcon('default');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelect = async (key: IconKey) => {
    try {
      hapticFeedback.selection();
      setAnimatingIcon(key);

      const animations = animationValues.current.get(key);
      if (animations) {
        // Reset rotation to 0 first
        animations.rotate.setValue(0);

        // Animate: scale down + spin, then scale back up
        Animated.sequence([
          Animated.parallel([
            Animated.timing(animations.scale, {
              toValue: 0.75,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(animations.rotate, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
          Animated.spring(animations.scale, {
            toValue: 1,
            friction: 5,
            tension: 100,
            useNativeDriver: true,
          }),
        ]).start();

        // Clear animating state after the main animation completes (before spring)
        setTimeout(() => {
          setAnimatingIcon(null);
        }, 500);
      }

      await DynamicAppIcon.setAppIcon(key);
      setActiveIcon(key);
    } catch (e) {
      // no-op; optionally surface an alert if needed
      setAnimatingIcon(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, animatingIcon && styles.disabledButton]}
          onPress={() => {
            if (!animatingIcon) {
              hapticFeedback.selection();
              onBack();
            }
          }}
          activeOpacity={animatingIcon ? 1 : 0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          disabled={!!animatingIcon}
        >
          <ChevronLeft width={24} height={24} color={animatingIcon ? '#CCCCCC' : '#000000'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('settings.appIconTitle')}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <FlatList
          data={iconEntries}
          keyExtractor={([key]) => `app-icon-${key}`}
          renderItem={({ item }) => {
            const [key, source] = item;
            const isActive = key === activeIcon;
            const animations = animationValues.current.get(key);

            const rotateInterpolation = animations?.rotate.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            });

            return (
              <TouchableOpacity
                onPress={() => {
                  handleSelect(key);
                }}
                activeOpacity={0.8}
                style={{ width: itemSize, height: itemSize, marginRight: gap, marginBottom: gap }}
              >
                <Animated.View
                  style={{
                    width: itemSize,
                    height: itemSize,
                    transform: [
                      { scale: animations?.scale || 1 },
                      { rotate: rotateInterpolation || '0deg' },
                    ],
                  }}
                >
                  <Image
                    source={source}
                    style={{
                      width: itemSize,
                      height: itemSize,
                      borderRadius: 38 * 0.4453125,
                    }}
                    contentFit="cover"
                    accessibilityIgnoresInvertColors
                  />
                </Animated.View>
                {isActive && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -7,
                      left: -7,
                      right: -7,
                      bottom: -7,
                      borderRadius: 50 * 0.4453125,
                      borderWidth: 4,
                      borderColor: '#000000',
                    }}
                  />
                )}
              </TouchableOpacity>
            );
          }}
          numColumns={columns}
          columnWrapperStyle={{ marginBottom: 0, justifyContent: 'flex-start' }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: horizontalPadding,
            paddingTop: 10,
            paddingBottom: 24,
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#F8F8F8',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
});
