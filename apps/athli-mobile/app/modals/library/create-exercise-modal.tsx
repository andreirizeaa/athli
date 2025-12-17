import React, { useState, useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View, ScrollView, TextInput, Image, Linking, TouchableOpacity, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';
import { Card } from '@/components/card';
import { Separator } from '@/components/separator';

type ParameterOption = 'None' | 'Reps' | 'Weight' | 'Duration' | 'Distance' | 'Watts' | 'RPE' | 'Calories' | 'Speed';

const PARAMETER_OPTIONS: ParameterOption[] = ['None', 'Reps', 'Weight', 'Duration', 'Distance', 'Watts', 'RPE', 'Calories', 'Speed'];

const extractVideoId = (url: string): { id: string; type: 'youtube' | 'vimeo' | null } => {
  if (!url.trim()) {
    return { id: '', type: null };
  }

  // YouTube patterns
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return { id: youtubeMatch[1], type: 'youtube' };
  }

  // Vimeo patterns
  const vimeoRegex = /(?:vimeo\.com\/)(?:.*\/)?(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return { id: vimeoMatch[1], type: 'vimeo' };
  }

  return { id: '', type: null };
};

export default function CreateExerciseModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [parameterLeft, setParameterLeft] = useState<ParameterOption>('Weight');
  const [parameterRight, setParameterRight] = useState<ParameterOption>('Reps');
  const [videoLink, setVideoLink] = useState('');
  const [instructions, setInstructions] = useState('');
  const [vimeoThumbnail, setVimeoThumbnail] = useState<string | null>(null);
  const [isLoadingVimeoThumbnail, setIsLoadingVimeoThumbnail] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const videoLinkInputRef = useRef<TextInput>(null);
  const instructionsInputRef = useRef<TextInput>(null);
  const videoLinkRowRef = useRef<View>(null);
  const instructionsRowRef = useRef<View>(null);
  const videoPreviewRef = useRef<View>(null);
  const inputCardRef = useRef<View>(null);

  const canContinue = name.trim().length > 0;

  useEffect(() => {
    const { id, type } = extractVideoId(videoLink);
    if (id && type === 'vimeo') {
      setIsLoadingVimeoThumbnail(true);
      fetch(`https://vimeo.com/api/v2/video/${id}.json`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data[0] && data[0].thumbnail_large) {
            setVimeoThumbnail(data[0].thumbnail_large);
          }
          setIsLoadingVimeoThumbnail(false);
        })
        .catch(() => {
          setIsLoadingVimeoThumbnail(false);
        });
    } else {
      setVimeoThumbnail(null);
      setIsLoadingVimeoThumbnail(false);
    }
  }, [videoLink]);

  // Scroll to video preview when it appears
  useEffect(() => {
    const { id, type } = extractVideoId(videoLink);
    if (id && type && videoPreviewRef.current) {
      setTimeout(() => {
        const sv = scrollViewRef.current;
        const preview = videoPreviewRef.current;
        if (!sv || !preview) return;

        (sv as any).measureInWindow((sx: number, sy: number) => {
          preview.measureInWindow((px: number, py: number) => {
            const delta = py - (sy + TOP_OFFSET);
            const targetY = scrollYRef.current + delta;
            sv.scrollTo({ y: Math.max(0, targetY), animated: true });
          });
        });
      }, Platform.OS === 'ios' ? 300 : 150);
    }
  }, [videoLink]);

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleContinue = async () => {
    if (!canContinue) return;

    // TODO: Call exercise service to create exercise
    // await createNewExercise({
    //   name: name.trim(),
    //   parameterLeft,
    //   parameterRight,
    //   videoLink: videoLink.trim() || undefined,
    //   instructions: instructions.trim() || undefined,
    // });

    // Close the modal
    if (router.canGoBack()) {
      router.back();
    }
  };

  const { id: videoId, type: videoType } = extractVideoId(videoLink);

  const handleVideoPreviewPress = () => {
    if (videoLink.trim()) {
      Linking.openURL(videoLink.trim());
    }
  };

  const TOP_OFFSET = 0; // set to 12 if you want a little padding from the top

  const scrollRowToTop = (rowRef: React.RefObject<View | null>) => {
    // Let layout settle (KeyboardAvoidingView shifts things)
    setTimeout(() => {
      const sv = scrollViewRef.current;
      const row = rowRef.current;
      if (!sv || !row) return;

      (sv as any).measureInWindow((sx: number, sy: number) => {
        row.measureInWindow((rx: number, ry: number) => {
          // We want the row's top (ry) to align with the scrollview's top (sy)
          const delta = ry - (sy + TOP_OFFSET);
          const targetY = scrollYRef.current + delta;

          sv.scrollTo({ y: Math.max(0, targetY), animated: true });
        });
      });
    }, Platform.OS === 'ios' ? 250 : 100);
  };

  const handleVideoLinkFocus = () => scrollRowToTop(videoLinkRowRef);

  const scrollContainerBottomVisible = () => {
    // Let layout settle (KeyboardAvoidingView shifts things)
    setTimeout(() => {
      const sv = scrollViewRef.current;
      const card = inputCardRef.current;
      if (!sv || !card) return;

      (sv as any).measureInWindow((sx: number, sy: number, swidth: number, sheight: number) => {
        card.measureInWindow((cx: number, cy: number, cwidth: number, cheight: number) => {
          // Calculate the bottom of the card
          const cardBottom = cy + cheight;
          // Calculate the bottom of the ScrollView viewport
          const scrollViewBottom = sy + sheight;
          
          // We want the card's bottom to be visible above the keyboard
          // The KeyboardAvoidingView will push content up, but we need to ensure
          // we've scrolled enough so the bottom is in the visible area
          // Add some padding (e.g., 20px) to ensure it's comfortably visible
          const padding = 20;
          const targetBottom = scrollViewBottom - padding;
          
          // If card bottom is below the target, we need to scroll
          if (cardBottom > targetBottom) {
            const delta = cardBottom - targetBottom;
            const targetY = scrollYRef.current + delta;
            sv.scrollTo({ y: Math.max(0, targetY), animated: true });
          }
        });
      });
    }, Platform.OS === 'ios' ? 300 : 150);
  };

  const handleInstructionsFocus = () => scrollContainerBottomVisible();

  const renderVideoPreview = () => {
    if (!videoId || !videoType) return null;

    if (videoType === 'youtube') {
      return (
        <View ref={videoPreviewRef}>
          <TouchableOpacity
            style={styles.videoPreviewContainer}
            onPress={handleVideoPreviewPress}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }}
              style={styles.videoThumbnail}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
      );
    }

    if (videoType === 'vimeo') {
      if (isLoadingVimeoThumbnail) {
        return (
          <View style={[styles.videoPreviewContainer, styles.videoPreviewPlaceholder]}>
            <Text style={[styles.videoPreviewPlaceholderText, { color: themeColors.mutedText }]}>
              Loading thumbnail...
            </Text>
          </View>
        );
      }

      if (vimeoThumbnail) {
        return (
          <View ref={videoPreviewRef}>
            <TouchableOpacity
              style={styles.videoPreviewContainer}
              onPress={handleVideoPreviewPress}
              activeOpacity={0.8}
            >
              <Image source={{ uri: vimeoThumbnail }} style={styles.videoThumbnail} resizeMode="cover" />
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <View style={[styles.videoPreviewContainer, styles.videoPreviewPlaceholder]}>
          <Text style={[styles.videoPreviewPlaceholderText, { color: themeColors.mutedText }]}>
            Video preview
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === 'android' ? 20 + insets.top : 20,
            backgroundColor: themeColors.background,
          },
        ]}
      >
        <IconButton
          icon={{ sf: 'xmark', IconComponent: X }}
          onPress={handleClose}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.title, { color: themeColors.text }]}>
          {t('library.createPages.exercise')}
        </Text>
        <IconButton
          icon={{ sf: 'checkmark', IconComponent: Check }}
          onPress={handleContinue}
          size="md"
          color={canContinue ? themeColors.primary : themeColors.mutedText}
          disabled={!canContinue}
          activeOpacity={canContinue ? 0.7 : 1}
          style={!canContinue ? { opacity: 0.5 } : undefined}
        />
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={(e) => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
        <View ref={inputCardRef}>
          <Card style={styles.inputCard}>
          {/* Name Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: themeColors.text }]}
              placeholder={t('library.createModal.namePlaceholder')}
              placeholderTextColor={themeColors.mutedText}
              value={name}
              onChangeText={setName}
              textAlignVertical="center"
            />
          </View>
          <Separator />
          {/* Parameter Section */}
          <View style={styles.parameterSection}>
            <Text style={[styles.parameterLabel, { color: themeColors.text }]}>
              {t('library.createModal.parameter')}
            </Text>
            <View style={styles.pickerRow}>
              <View style={styles.pickerColumn}>
                <Picker
                  selectedValue={parameterLeft}
                  onValueChange={(itemValue) => setParameterLeft(itemValue as ParameterOption)}
                  style={[styles.picker, { color: themeColors.text }]}
                  itemStyle={[styles.pickerItem, { color: themeColors.text }]}
                >
                  {PARAMETER_OPTIONS.map((option) => (
                    <Picker.Item key={option} label={option} value={option} />
                  ))}
                </Picker>
              </View>
              <View style={styles.pickerColumn}>
                <Picker
                  selectedValue={parameterRight}
                  onValueChange={(itemValue) => setParameterRight(itemValue as ParameterOption)}
                  style={[styles.picker, { color: themeColors.text }]}
                  itemStyle={[styles.pickerItem, { color: themeColors.text }]}
                >
                  {PARAMETER_OPTIONS.map((option) => (
                    <Picker.Item key={option} label={option} value={option} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
          <Separator />
          {/* Video Link Input */}
          <View ref={videoLinkRowRef} style={styles.inputRow}>
            <View style={styles.videoLinkContainer}>
              <TextInput
                ref={videoLinkInputRef}
                style={[styles.input, styles.videoLinkInput, { color: themeColors.text }]}
                placeholder={t('library.createModal.videoLinkPlaceholder')}
                placeholderTextColor={themeColors.mutedText}
                value={videoLink}
                onChangeText={setVideoLink}
                onFocus={handleVideoLinkFocus}
                textAlignVertical="center"
              />
              {videoLink.length > 0 && (
                <IconButton
                  icon={{ sf: 'xmark', IconComponent: X }}
                  onPress={() => {
                    setVideoLink('');
                    setVimeoThumbnail(null);
                    setIsLoadingVimeoThumbnail(false);
                  }}
                  size="sm"
                  color={themeColors.mutedText}
                  style={styles.clearButton}
                />
              )}
            </View>
          </View>
          {renderVideoPreview()}
          <Separator />
          {/* Instructions Input */}
          <View ref={instructionsRowRef} style={styles.inputRow}>
            <TextInput
              ref={instructionsInputRef}
              style={[styles.input, styles.multilineInput, { color: themeColors.text }]}
              placeholder={t('library.createModal.descriptionPlaceholder')}
              placeholderTextColor={themeColors.mutedText}
              value={instructions}
              onChangeText={setInstructions}
              onFocus={handleInstructionsFocus}
              multiline
              textAlignVertical="top"
            />
          </View>
        </Card>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  inputCard: {
    marginTop: 8,
  },
  inputRow: {
    paddingVertical: 12,
    minHeight: 44,
  },
  input: {
    ...typography.p2,
    padding: 0,
  },
  videoLinkContainer: {
    position: 'relative',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoLinkInput: {
    flex: 1,
    paddingRight: 40,
  },
  clearButton: {
    position: 'absolute',
    right: 0,
  },
  multilineInput: {
    minHeight: 160,
    paddingTop: 8,
  },
  parameterSection: {
    paddingVertical: 12,
  },
  parameterLabel: {
    ...typography.p2,
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    width: '100%',
  },
  pickerColumn: {
    flex: 1,
    width: '50%',
  },
  picker: {
    width: '100%',
  },
  pickerItem: {
    ...typography.p2,
    fontSize: 13,
  },
  videoPreviewContainer: {
    marginBottom: 8,
    width: 200,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoPreviewPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreviewPlaceholderText: {
    ...typography.p2,
  },
});

