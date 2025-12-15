import React, { useEffect, useMemo, useState, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View, Alert, Text, Animated, LayoutChangeEvent, Dimensions, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { X, Image, RotateCw, Zap, ZapOff } from 'lucide-react-native';
import { Camera as VisionCamera, useCameraDevice, useCameraPermission, type Camera as CameraType } from 'react-native-vision-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { iconSizes, typography } from '@/constants/typography';
import { useThemePreference, useColorScheme } from '@/contexts/useColorScheme';
import { hexToRgba } from '@/utils/colorUtils';
import { PlatformIcon } from '@/components/platform-icon';
import { AttachmentPreviewScreen } from './attachment-preview-screen';
import { sendImageMessage, sendVideoMessage } from '@/services/chats-service';

export default function Camera() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    chatId?: string;
    clientId?: string;
    clientName?: string;
    selectedImages?: string; // JSON string of ImageData[]
  }>();
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();
  const backDevice = useCameraDevice('back', {
    physicalDevices: ['ultra-wide-angle-camera', 'wide-angle-camera', 'telephoto-camera'],
  });
  const frontDevice = useCameraDevice('front');
  const cameraRef = useRef<CameraType>(null);
  const [isActive, setIsActive] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>('back');
  const [capturedPhotos, setCapturedPhotos] = useState<Array<{ uri: string; bytes: Uint8Array; id: string }>>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isAddingMore, setIsAddingMore] = useState(false);
  const [caption, setCaption] = useState('');

  // Handle pre-selected images from attachment picker
  useEffect(() => {
    if (params.selectedImages) {
      try {
        const images = JSON.parse(params.selectedImages);
        if (Array.isArray(images) && images.length > 0) {
          setCapturedPhotos(images);
          setSelectedImageId(images[0].id);
        }
      } catch (error) {
        console.error('Error parsing selected images:', error);
      }
    }
  }, [params.selectedImages]);
  
  const device = cameraPosition === 'back' ? backDevice : frontDevice;

  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

  const neutralZoom = device?.neutralZoom ?? 1;

  // We want 0.5x..10x in "display zoom" space, but must clamp to what the device supports.
  const displayMin = device ? Math.max(0.5, device.minZoom / neutralZoom) : 1;
  const displayMax = device ? Math.min(10, device.maxZoom / neutralZoom) : 1;

  // Convert display zoom bounds back into VisionCamera's zoom numbers:
  const minZoom = device ? displayMin * neutralZoom : 1;
  const maxZoom = device ? displayMax * neutralZoom : 1;

  const [isRecording, setIsRecording] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(false);
  
  // When adding more, force photo mode and hide video option
  useEffect(() => {
    if (isAddingMore) {
      setIsVideoMode(false);
      setIsRecording(false);
    }
  }, [isAddingMore]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const [zoomLabel, setZoomLabel] = useState('1x');
  const [zoom, setZoom] = useState(1);
  const recordingIntervalRef = useRef<number | null>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const innerCircleScale = useRef(new Animated.Value(1)).current;
  const videoTextWidth = useRef(0);
  const photoTextWidth = useRef(0);
  const screenWidth = useRef(0);
  // Initial value will be calculated after measuring
  const bottomBarTranslateX = useRef(new Animated.Value(0)).current;
  const zoomButtonOpacity = useRef(new Animated.Value(1)).current;

  // --- Zoom HUD (slider) ---
  const SLIDER_WIDTH = 300;
  const DOT_SIZE = 12;

  const zoomStartRef = useRef(1);
  const zoomHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoomHudOpacity = useRef(new Animated.Value(0)).current;
  const sliderDotX = useRef(new Animated.Value(0)).current;

  const formatZoomLabel = (z: number) => {
    // z is "display zoom" (0.5..10)
    const rounded =
      z < 1 ? Math.round(z * 10) / 10 :
      z < 10 ? Math.round(z * 10) / 10 :
      Math.round(z);

    const str = Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(1)}`;
    return `${str}x`;
  };

  const showZoomHud = () => {
    if (zoomHideTimeoutRef.current) clearTimeout(zoomHideTimeoutRef.current);
    Animated.timing(zoomHudOpacity, { toValue: 1, duration: 120, useNativeDriver: true }).start();
  };

  const hideZoomHudLater = () => {
    if (zoomHideTimeoutRef.current) clearTimeout(zoomHideTimeoutRef.current);
    zoomHideTimeoutRef.current = setTimeout(() => {
      Animated.timing(zoomHudOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    }, 700);
  };

  const updateSliderDot = (displayZoom: number, displayMin: number, displayMax: number) => {
    const denom = displayMax - displayMin || 1;
    const t = Math.min(1, Math.max(0, (displayZoom - displayMin) / denom)); // 0..1
    const x = t * SLIDER_WIDTH - SLIDER_WIDTH / 2; // center-origin
    sliderDotX.setValue(x);
  };

  const zoomSteps = useMemo(() => {
    if (!device) return [{ label: '1x' as const, value: 1 }];

    const min = device.minZoom;          // always 1
    const max = device.maxZoom;
    const neutral = device.neutralZoom;  // 1x reference (can be > 1 on ultra-wide multi-cams)

    const factors = [0.5, 1, 2, 3] as const;

    return factors
      // only include steps that are actually reachable on this device
      .filter(f => neutral * f >= min && neutral * f <= max)
      .map(f => ({
        label: (f === 0.5 ? '0.5x' : `${f}x`) as '0.5x' | '1x' | '2x' | '3x',
        value: clamp(neutral * f, min, max),
      }));
  }, [device]);

  const iconColor = themeColors.text;
  const mutedSurfaceColor = themeColors.surfaceSecondary;
  
  // Create translucent background color for frosted glass effect (60% opacity)
  const headerBackgroundColor = themeColors.headerBackground;
  const translucentHeaderBg = hexToRgba(headerBackgroundColor, 0.6);

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

  const handleSend = async () => {
    if (!params.chatId) {
      return;
    }

    try {
      if (capturedPhotos.length > 0) {
        // Convert images to ImageAttachment format
        const imageAttachments = capturedPhotos.map((photo) => ({
          uri: photo.uri,
          id: photo.id,
        }));

        // Send images
        const imageBytesArray = capturedPhotos.map((photo) => photo.bytes);
        await sendImageMessage(params.chatId, imageBytesArray, caption.trim() || undefined);
        
        // Close camera and navigate back
        setIsActive(false);
        router.back();
        
        // Set params to add image message to list and close attachment picker
        setTimeout(() => {
          if (params.chatId) {
            router.setParams({
              imagesSent: 'true',
              sentImages: JSON.stringify(imageAttachments),
              sentImagesCaption: caption.trim() || '',
            } as any);
          }
        }, 200);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleAddMore = () => {
    setIsAddingMore(true);
    setSelectedImageId(null);
  };

  const handleImageSelected = (imageId: string) => {
    setSelectedImageId(imageId);
  };

  const handleDeleteImage = (imageId: string) => {
    if (capturedPhotos.length === 1) {
      // Only one image - close camera and go back
      setIsActive(false);
      router.back();
      return;
    }

    // Remove the image
    const newPhotos = capturedPhotos.filter((photo) => photo.id !== imageId);
    setCapturedPhotos(newPhotos);

    // If we deleted the selected image, select another one
    if (selectedImageId === imageId) {
      if (newPhotos.length > 0) {
        setSelectedImageId(newPhotos[0].id);
      } else {
        setSelectedImageId(null);
      }
    }
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

      // If adding more images, only allow images
      if (isAddingMore) {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: false,
          quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          if (asset.uri) {
            // Read the image file as bytes
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: 'base64' as any,
            });

            // Convert base64 to Uint8Array
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            const newPhoto = {
              uri: asset.uri,
              bytes,
              id: `photo-${Date.now()}-${Math.random()}`,
            };

            setCapturedPhotos((prev) => [...prev, newPhoto]);
            setSelectedImageId(newPhoto.id);
            setIsAddingMore(false);
          }
        }
        // If canceled, do nothing - camera page stays open
        return;
      }

      // If video mode is on, allow video only and single select
      if (isVideoMode) {
      const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['videos'],
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          if (!asset.uri) return;
          // Navigate to video preview screen
          router.push({
            pathname: '/video-preview',
            params: {
              uri: asset.uri,
              duration: (asset.duration || 0).toString(),
              orientation: asset.width && asset.height && asset.width > asset.height ? 'landscape' : 'portrait',
              chatId: params.chatId || '',
              clientId: params.clientId || '',
              clientName: params.clientName || '',
            },
          });
        }
        return;
      }

      // Photo mode: Open image picker with multi-select for images only
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Convert selected images to ImageData format
        const imageDataArray = await Promise.all(
          result.assets.map(async (asset, index) => {
            if (!asset.uri) return null;

            // Read the image file as bytes
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: 'base64' as any,
            });

            // Convert base64 to Uint8Array
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            return {
              uri: asset.uri,
              bytes,
              id: `photo-${Date.now()}-${index}-${Math.random()}`,
            };
          })
        );

        // Filter out any null values
        const validImages = imageDataArray.filter((img) => img !== null);

        if (validImages.length > 0) {
          // Set the captured photos and show preview
          setCapturedPhotos(validImages);
          setSelectedImageId(validImages[0].id);
        }
      }
      // If canceled, do nothing - camera page stays open
    } catch (error) {
      console.error('Error picking media:', error);
    }
  };

  const handleRotatePress = () => {
    const newPosition = cameraPosition === 'back' ? 'front' : 'back';
    setCameraPosition(newPosition);

    // Reset zoom when switching cameras
    const newDevice = newPosition === 'back' ? backDevice : frontDevice;
    if (newDevice) {
      const startZoom = clamp(newDevice.neutralZoom, minZoom, maxZoom);
      setZoom(startZoom);
      const display = startZoom / newDevice.neutralZoom;
      setZoomLabel(formatZoomLabel(display));
      updateSliderDot(display, displayMin, displayMax);
    } else {
      setZoomLabel('1x');
      setZoom(1);
    }
    
    // Animate zoom button opacity
    Animated.timing(zoomButtonOpacity, {
      toValue: newPosition === 'back' ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleZoomPress = () => {
    const idx = zoomSteps.findIndex(s => s.label === zoomLabel);
    const next = zoomSteps[(idx + 1) % zoomSteps.length];
    setZoomLabel(next.label);
    setZoom(next.value);
    
    // Update slider dot position but don't show HUD when manually changing zoom
    if (device) {
      const display = next.value / device.neutralZoom;
      updateSliderDot(display, displayMin, displayMax);
    }
  };

  const lastDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (evt) => {
          // Only respond if we have 2 touches (pinch gesture)
          return evt.nativeEvent.touches.length === 2;
        },
        onPanResponderGrant: () => {
          if (!device) return;
          initialZoomRef.current = zoom;
          zoomStartRef.current = zoom;
          lastDistanceRef.current = null;
          showZoomHud();
        },
        onPanResponderMove: (evt) => {
          if (!device || evt.nativeEvent.touches.length !== 2) return;

          const touch1 = evt.nativeEvent.touches[0];
          const touch2 = evt.nativeEvent.touches[1];

          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) + Math.pow(touch2.pageY - touch1.pageY, 2)
          );

          if (lastDistanceRef.current === null) {
            lastDistanceRef.current = distance;
            return;
          }

          const scale = distance / lastDistanceRef.current;
          // Use a slightly non-linear curve so it feels nicer
          const scaled = Math.pow(scale, 1.6);

          const nextZoom = clamp(zoomStartRef.current * scaled, minZoom, maxZoom);
          setZoom(nextZoom);

          const display = nextZoom / device.neutralZoom; // 0.5..10 (clamped)
          setZoomLabel(formatZoomLabel(display));
          updateSliderDot(display, displayMin, displayMax);

          zoomStartRef.current = nextZoom;
          lastDistanceRef.current = distance;

          showZoomHud();
          hideZoomHudLater();
        },
        onPanResponderRelease: () => {
          lastDistanceRef.current = null;
          hideZoomHudLater();
        },
        onPanResponderTerminate: () => {
          lastDistanceRef.current = null;
          hideZoomHudLater();
        },
      }),
    [device, zoom, minZoom, maxZoom, displayMin, displayMax, formatZoomLabel, updateSliderDot, showZoomHud, hideZoomHudLater, clamp]
  );

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleButtonPress = async () => {
    if (isVideoMode && !isRecording) {
      // Start recording
      if (cameraRef.current && device) {
        try {
          setIsRecording(true);
          setRecordingTime(0);
          recordingIntervalRef.current = setInterval(() => {
            setRecordingTime((prev) => prev + 1);
          }, 1000);
          
          await cameraRef.current.startRecording({
            flash: flashEnabled ? 'on' : 'off',
            onRecordingFinished: (video) => {
              const videoUri = `file://${video.path}`;
              const duration = Math.floor(video.duration / 1000); // Convert ms to seconds
              
              // Determine orientation based on video dimensions
              const isPortrait = video.width < video.height;
              const orientation = isPortrait ? 'portrait' : 'landscape';
              
              setIsRecording(false);
              // Navigate to video preview screen
              router.push({
                pathname: '/video-preview',
                params: {
                uri: videoUri,
                  duration: duration.toString(),
                orientation,
                  chatId: params.chatId || '',
                  clientId: params.clientId || '',
                  clientName: params.clientName || '',
                },
              });
              if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
                recordingIntervalRef.current = null;
              }
            },
            onRecordingError: (error) => {
              console.error('Recording error:', error);
              setIsRecording(false);
              if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
                recordingIntervalRef.current = null;
              }
              Alert.alert('Error', 'Failed to record video');
            },
          });
        } catch (error) {
          console.error('Error starting recording:', error);
          setIsRecording(false);
          Alert.alert('Error', 'Failed to start recording');
        }
      }
    } else if (isVideoMode && isRecording) {
      // Stop recording
      if (cameraRef.current) {
        try {
          await cameraRef.current.stopRecording();
        } catch (error) {
          console.error('Error stopping recording:', error);
          setIsRecording(false);
          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
          }
        }
      }
    } else if (!isVideoMode) {
      // Take photo
      if (cameraRef.current && device) {
        try {
          const photo = await cameraRef.current.takePhoto({
            flash: flashEnabled ? 'on' : 'off',
          });
          
          // Read the photo file as bytes using legacy API
          const fileUri = `file://${photo.path}`;
          const base64 = await FileSystem.readAsStringAsync(fileUri, {
            encoding: 'base64' as any,
          });
          
          // Convert base64 to Uint8Array
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const newPhoto = {
            uri: fileUri,
            bytes,
            id: `photo-${Date.now()}-${Math.random()}`,
          };
          
          setCapturedPhotos((prev) => [...prev, newPhoto]);
          setSelectedImageId(newPhoto.id);
          setIsAddingMore(false);
        } catch (error) {
          console.error('Error taking photo:', error);
          Alert.alert('Error', 'Failed to take photo');
        }
      }
    }
  };

  const handleButtonPressIn = () => {
    // Only handle press in for video mode
    // Photo mode uses simple tap (handleButtonPress)
  };

  const handleButtonPressOut = () => {
    // Only handle press out for video mode
    // Photo mode uses simple tap (handleButtonPress)
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

  useEffect(() => {
    if (!device) return;

    // Start at 1x (neutral zoom)
    const startZoom = clamp(device.neutralZoom, minZoom, maxZoom);
    setZoom(startZoom);

    const display = startZoom / device.neutralZoom;
    setZoomLabel(formatZoomLabel(display));
    updateSliderDot(display, displayMin, displayMax);
  }, [device?.id]);

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

  if (!backDevice && !frontDevice) {
    return null;
  }

  if (!device) {
    return null;
  }

  // Video preview is now handled by separate route

  // Show preview UI when photos are captured
  if (capturedPhotos.length > 0 && !isAddingMore) {
    const selectedPhoto = capturedPhotos.find((p) => p.id === selectedImageId) || capturedPhotos[0];
    return (
      <AttachmentPreviewScreen
        images={capturedPhotos}
        selectedImageId={selectedImageId || capturedPhotos[0].id}
        caption={caption}
        onCaptionChange={setCaption}
        clientName={params.clientName}
        onClose={handleClose}
        onSend={handleSend}
        onAddMore={handleAddMore}
        onImageSelected={handleImageSelected}
        onDeleteImage={handleDeleteImage}
      />
    );
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar hidden />
        <VisionCamera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isActive}
          torch={flashEnabled ? 'on' : 'off'}
          zoom={zoom}
          photo={true}
          video={true}
        />
        <View
          style={[
            styles.safeArea,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              paddingLeft: 0,
              paddingRight: 0,
            },
          ]}
        >
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
              color={flashEnabled ? themeColors.primaryForeground : iconColor}
            />
          </TouchableOpacity>
        </View>

        {/* Bottom controls */}
        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 36 }]}>
          {/* Photo button - bottom left */}
          <TouchableOpacity
            style={[styles.bottomButton, { backgroundColor: mutedSurfaceColor }]}
            activeOpacity={0.7}
            onPress={handlePhotoPress}
          >
            <PlatformIcon sf="photo" IconComponent={Image} size={iconSizes.tabBarIcons} color={iconColor} />
          </TouchableOpacity>

          {/* Record/Stop Button - Centered */}
          <View style={styles.recordButtonContainer}>
            <Animated.View style={[styles.zoomHud, { opacity: zoomHudOpacity }]} pointerEvents="none">
              <View style={styles.zoomHudTrack} />
              <Animated.View
                style={[
                  styles.zoomHudDot,
                  {
                    backgroundColor: themeColors.primary,
                    transform: [{ translateX: sliderDotX }],
                  },
                ]}
              />
            </Animated.View>
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
          </View>

          {/* Right side: Zoom button + Rotate button */}
          <View style={styles.rightControls}>
            <Animated.View style={{ opacity: zoomButtonOpacity }}>
              <TouchableOpacity
                style={[styles.zoomButton, { backgroundColor: mutedSurfaceColor }]}
                activeOpacity={0.7}
                onPress={handleZoomPress}
                disabled={cameraPosition === 'front'}
              >
                <Text style={[styles.zoomText, { color: themeColors.primary }]}>{zoomLabel}</Text>
              </TouchableOpacity>
            </Animated.View>

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
        </View>

        {/* Bottom bar with VIDEO/PHOTO text - hide when adding more */}
        {!isAddingMore && (
          <View style={styles.bottomBarContainer} pointerEvents="box-none">
            <BlurView
              intensity={100}
              tint="dark"
              style={[styles.bottomBarBlur, { backgroundColor: translucentHeaderBg, paddingBottom: insets.bottom }]}
            >
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
            </BlurView>
          </View>
        )}
      </View>
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
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
    paddingTop: 8,
    position: 'relative',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoomButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    ...typography.p3,
    fontSize: 12,
    fontWeight: '600',
  },
  bottomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -68,
    bottom: 0,
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
  bottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
  },
  bottomBarBlur: {
    width: '100%',
    paddingTop: 8,
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
  zoomHud: {
    position: 'absolute',
    top: -20,            // places it above the record button
    width: 300,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomHudTrack: {
    width: 300,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  zoomHudDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
