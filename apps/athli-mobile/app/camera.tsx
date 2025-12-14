import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View, Alert, Text, Animated, LayoutChangeEvent, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Image, RotateCw, Zap, ZapOff } from 'lucide-react-native';
import { Camera as VisionCamera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import * as ImagePicker from 'expo-image-picker';

import { iconSizes, typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { PlatformIcon } from '@/components/platform-icon';

export default function Camera() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const insets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [isActive, setIsActive] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const recordingIntervalRef = useRef<number | null>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const innerCircleScale = useRef(new Animated.Value(1)).current;
  const videoTextWidth = useRef(0);
  const photoTextWidth = useRef(0);
  const screenWidth = useRef(0);
  // Initial value will be calculated after measuring
  const bottomBarTranslateX = useRef(new Animated.Value(0)).current;

  const iconColor = themeColors.text;
  const mutedSurfaceColor = themeColors.surfaceSecondary;

  useEffect(() => {
    const checkPermission = async () => {
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          Alert.alert('Permission required', 'Please grant camera permission to use this feature.');
          router.back();
        }
      }
    };

    checkPermission();
  }, [hasPermission, requestPermission, router]);

  const handleClose = () => {
    setIsActive(false);
    router.back();
  };

  const handleFlashToggle = () => {
    setFlashEnabled(!flashEnabled);
  };

  const handlePhotoPress = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant permission to access your photos and videos.');
        return;
      }

      // Open image picker for both images and videos
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Item was selected - close camera page
        setIsActive(false);
        router.back();
        // TODO: Handle selected image/video
        console.log('Selected media:', result.assets[0]);
      }
      // If canceled, do nothing - camera page stays open
    } catch (error) {
      console.error('Error picking media:', error);
    }
  };

  const handleRotatePress = () => {
    // TODO: Implement camera rotation
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleButtonPress = () => {
    if (isVideoMode && !isRecording) {
      // Start recording
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else if (isVideoMode && isRecording) {
      // Stop recording
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const handleButtonPressIn = () => {
    if (!isVideoMode) {
      setIsButtonPressed(true);
      setRecordingTime(0);
      setIsRecording(true);
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      Animated.parallel([
        Animated.spring(buttonScale, {
          toValue: 1.2,
          useNativeDriver: true,
        }),
        Animated.spring(innerCircleScale, {
          toValue: 1.2,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleButtonPressOut = () => {
    if (!isVideoMode) {
      setIsButtonPressed(false);
      setIsRecording(false);
      // Stop timer
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setRecordingTime(0);
      Animated.parallel([
        Animated.spring(buttonScale, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(innerCircleScale, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const calculateTranslation = (isVideo: boolean) => {
    if (screenWidth.current === 0 || videoTextWidth.current === 0 || photoTextWidth.current === 0) {
      return 0;
    }
    const gap = 40;
    
    if (isVideo) {
      // Container is positioned at left: '50%' (screen center)
      // VIDEO's center is at videoTextWidth / 2 from container's left edge
      // To center VIDEO: translate left by videoTextWidth / 2
      return -(videoTextWidth.current / 2);
    } else {
      // Container is positioned at left: '50%' (screen center)
      // PHOTO's center is at (videoTextWidth + gap + photoTextWidth / 2) from container's left edge
      // To center PHOTO: translate left by (videoTextWidth + gap + photoTextWidth / 2)
      return -(videoTextWidth.current + gap + photoTextWidth.current / 2);
    }
  };

  const handleVideoTextPress = () => {
    setIsVideoMode(true);
    const translation = calculateTranslation(true);
    Animated.timing(bottomBarTranslateX, {
      toValue: translation,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePhotoTextPress = () => {
    setIsVideoMode(false);
    setIsRecording(false);
    setRecordingTime(0);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    const translation = calculateTranslation(false);
    Animated.timing(bottomBarTranslateX, {
      toValue: translation,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    // Get screen width
    screenWidth.current = Dimensions.get('window').width;
    
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const updateTranslation = (animated = false) => {
    if (screenWidth.current > 0 && videoTextWidth.current > 0 && photoTextWidth.current > 0) {
      const translation = calculateTranslation(isVideoMode);
      if (animated) {
        Animated.timing(bottomBarTranslateX, {
          toValue: translation,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        bottomBarTranslateX.setValue(translation);
      }
    }
  };

  const handleVideoTextLayout = (event: LayoutChangeEvent) => {
    videoTextWidth.current = event.nativeEvent.layout.width;
    updateTranslation();
  };

  const handlePhotoTextLayout = (event: LayoutChangeEvent) => {
    photoTextWidth.current = event.nativeEvent.layout.width;
    updateTranslation();
  };

  useEffect(() => {
    // Only animate if we have all measurements (not on initial mount)
    if (videoTextWidth.current > 0 && photoTextWidth.current > 0) {
      updateTranslation(true);
    }
  }, [isVideoMode]);

  if (!hasPermission) {
    return null;
  }

  if (!device) {
    return null;
  }

  return (
    <View style={styles.container}>
      <VisionCamera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Top header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: mutedSurfaceColor }]}
            activeOpacity={0.7}
            onPress={handleClose}
          >
            <PlatformIcon sf="xmark" IconComponent={X} size={iconSizes.navigationChevrons} color={iconColor} />
          </TouchableOpacity>
          {(isVideoMode || isRecording) && (
            <View
              style={[
                styles.timerPill,
                {
                  backgroundColor: isRecording ? '#FF3B30' : mutedSurfaceColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.timerText,
                  {
                    color: isRecording ? '#FFFFFF' : iconColor,
                  },
                ]}
              >
                {formatTime(recordingTime)}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.flashButton,
              {
                backgroundColor: flashEnabled ? themeColors.primary : mutedSurfaceColor,
              },
            ]}
            activeOpacity={0.7}
            onPress={handleFlashToggle}
          >
            <PlatformIcon
              sf={flashEnabled ? 'bolt.fill' : 'bolt.slash.fill'}
              IconComponent={flashEnabled ? Zap : ZapOff}
              size={iconSizes.tabBarIcons}
              color={flashEnabled ? '#FFFFFF' : iconColor}
            />
          </TouchableOpacity>
        </View>

        {/* Bottom controls */}
        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 36 }]}>
          <TouchableOpacity
            style={[styles.bottomButton, { backgroundColor: mutedSurfaceColor }]}
            activeOpacity={0.7}
            onPress={handlePhotoPress}
          >
            <PlatformIcon sf="photo" IconComponent={Image} size={iconSizes.tabBarIcons} color={iconColor} />
          </TouchableOpacity>

          {/* Record/Stop Button */}
          <TouchableOpacity
            style={[styles.recordButton, isRecording && styles.stopButton]}
            onPress={handleButtonPress}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
            activeOpacity={0.8}
          >
            <Animated.View
              style={[
                styles.recordButtonInner,
                {
                  transform: [{ scale: buttonScale }],
                },
              ]}
            >
              {isRecording && isVideoMode ? (
                <View style={styles.recordSquare} />
              ) : (
                <Animated.View
                  style={[
                    styles.recordIcon,
                    {
                      backgroundColor: isVideoMode || isButtonPressed ? '#FF3B30' : '#FFFFFF',
                      transform: [{ scale: innerCircleScale }],
                    },
                  ]}
                />
              )}
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomButton, { backgroundColor: mutedSurfaceColor }]}
            activeOpacity={0.7}
            onPress={handleRotatePress}
          >
            <PlatformIcon
              sf="arrow.trianglehead.2.clockwise"
              IconComponent={RotateCw}
              size={iconSizes.tabBarIcons}
              color={iconColor}
            />
          </TouchableOpacity>
        </View>

        {/* Bottom bar with VIDEO/PHOTO text */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
          <View style={styles.bottomBarWrapper}>
            <Animated.View
              style={[
                styles.bottomBarContent,
                {
                  transform: [{ translateX: bottomBarTranslateX }],
                },
              ]}
            >
              <TouchableOpacity onPress={handleVideoTextPress} style={styles.textButton} onLayout={handleVideoTextLayout}>
                <Text style={[styles.modeText, isVideoMode && styles.modeTextActive]}>VIDEO</Text>
              </TouchableOpacity>
              <View style={styles.textGap} />
              <TouchableOpacity onPress={handlePhotoTextPress} style={styles.textButton} onLayout={handlePhotoTextLayout}>
                <Text style={[styles.modeText, !isVideoMode && styles.modeTextActive]}>PHOTO</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  timerPill: {
    borderRadius: 10,
    height: 36,
    minWidth: 80,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    ...typography.h6,
    letterSpacing: 0.7,
    fontVariant: ['tabular-nums'],
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  bottomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  recordButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  recordIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
  },
  recordSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
    backgroundColor: '#000000',
    width: '100%',
  },
  bottomBarWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: '50%',
  },
  textButton: {
    paddingHorizontal: 0,
  },
  textGap: {
    width: 40,
  },
  modeText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
});
