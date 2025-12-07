import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import i18n from '../../../../utils/i18n';
import { useTutorialTarget } from '../../../../context/TutorialContext';
import { Check, X } from 'lucide-react-native';
import { hapticFeedback } from '../../../../utils/haptic';
import { BodyPart } from '../../../../constants/gymMovements';
import { track } from '../../../../services/analytics';

interface MovementSelectionScreenProps {
  selectedMovement: string;
  searchQuery: string;
  filteredMovements: string[];
  selectedBodyPart: BodyPart;
  onMovementSelect: (movement: string) => void;
  onSearchChange: (text: string) => void;
  onClearSearch: () => void;
  onBodyPartChange: (bodyPart: BodyPart) => void;
  onBack: () => void;
  onUpload: () => void;
  onClose: () => void;
  title?: string;
}

export function MovementSelectionScreen({
  selectedMovement,
  searchQuery,
  filteredMovements,
  selectedBodyPart,
  onMovementSelect,
  onSearchChange,
  onClearSearch,
  onBodyPartChange,
  onBack,
  onUpload,
  onClose,
  title = 'Upload Video',
}: MovementSelectionScreenProps) {
  const { ref: continueButtonRef } = useTutorialTarget('movement_selection_continue');
  // Variable-width segmented control with animated background
  const segments = [
    { label: 'All', value: 'all' as BodyPart, flex: 0.8 },
    { label: 'Chest', value: 'chest' as BodyPart, flex: 1 },
    { label: 'Back', value: 'back' as BodyPart, flex: 0.8 },
    { label: 'Shoulders', value: 'shoulders' as BodyPart, flex: 1.4 },
    { label: 'Arms', value: 'arms' as BodyPart, flex: 0.8 },
    { label: 'Legs', value: 'legs' as BodyPart, flex: 0.8 },
  ];

  const layoutsRef = useRef<Record<string, { x: number; width: number }>>({});
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);

  function animateToSelection(part: BodyPart) {
    const layout = layoutsRef.current[part];
    if (!layout) return;
    indicatorX.value = withTiming(layout.x, { duration: 200 });
    indicatorW.value = withTiming(layout.width, { duration: 200 });
  }

  useEffect(() => {
    animateToSelection(selectedBodyPart);
  }, [selectedBodyPart]);

  const animatedBackgroundStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: indicatorX.value }],
      width: indicatorW.value,
    };
  });

  return (
    <>
      {/* Content */}
      <View style={styles.content}>
        <View style={styles.movementSelectionContainer}>
          <Text style={styles.movementSelectionTitle}>{i18n.t('add.whatExercise')}</Text>

          {/* Body Part Segmented Control */}
          <View style={styles.segmentedWrapper}>
            <View style={styles.segmented}>
              <Animated.View style={[styles.segmentBackground, animatedBackgroundStyle]} />
              {segments.map((segment) => {
                const active = selectedBodyPart === segment.value;
                return (
                  <TouchableOpacity
                    key={segment.value}
                    style={[styles.segment, styles.segmentTouchable, { flex: segment.flex }]}
                    activeOpacity={0.9}
                    onLayout={(e) => {
                      const { x, width } = e.nativeEvent.layout;
                      layoutsRef.current[segment.value] = { x, width };
                      if (active) animateToSelection(segment.value);
                    }}
                    onPress={() => {
                      if (!active) {
                        hapticFeedback.selection();
                        // Track add analysis clicks for body part segments
                        track('Add analysis', { event: `Movement shortuct: ${segment.label}` });
                        onBodyPartChange(segment.value);
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {segment.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.searchInputContainer}>
            <TextInput
              ref={continueButtonRef}
              style={styles.searchInput}
              placeholder={i18n.t('add.searchMovements')}
              value={searchQuery}
              onChangeText={(text) => {
                // Track add analysis clicks for search lift name
                if (text.length > 0 && searchQuery.length === 0) {
                  track('Add analysis', { event: 'Search lift name' });
                }
                onSearchChange(text);
              }}
              placeholderTextColor="#8E8E93"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  hapticFeedback.selection();
                  onClearSearch();
                }}
                activeOpacity={0.7}
              >
                <X width={20} height={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={styles.movementsList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {filteredMovements.length > 0 ? (
              filteredMovements.map((movement, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.movementItem,
                    selectedMovement === movement && styles.movementItemSelected,
                  ]}
                  onPress={() => onMovementSelect(movement)}
                  activeOpacity={0.7}
                  delayPressIn={0}
                >
                  <Text
                    style={[
                      styles.movementItemText,
                      selectedMovement === movement && styles.movementItemTextSelected,
                    ]}
                  >
                    {movement}
                  </Text>
                  {selectedMovement === movement && (
                    <View style={styles.checkmark}>
                      <Check width={20} height={20} color="#000000" />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            ) : searchQuery.trim().length > 0 ? (
              <TouchableOpacity
                style={[
                  styles.movementItem,
                  selectedMovement === searchQuery.trim() && styles.movementItemSelected,
                ]}
                onPress={() => onMovementSelect(searchQuery.trim())}
                activeOpacity={0.7}
                delayPressIn={0}
              >
                <Text
                  style={[
                    styles.movementItemText,
                    styles.customMovementText,
                    selectedMovement === searchQuery.trim() && styles.movementItemTextSelected,
                  ]}
                >
                  {i18n.t('add.useCustomMovement')} {searchQuery.trim()}?
                </Text>
                {selectedMovement === searchQuery.trim() && (
                  <View style={styles.checkmark}>
                    <Check width={20} height={20} color="#000000" />
                  </View>
                )}
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomControls}>
        <View style={styles.buttonStack}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // Track add analysis clicks for back to preview screen
              track('Add analysis', { event: 'Back to preview screen' });
              onBack();
            }}
          >
            <Text style={styles.backButtonText}>{i18n.t('add.back')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.uploadButton, !selectedMovement && styles.uploadButtonDisabled]}
            onPress={() => {
              // Track add analysis clicks for continue to weights and reps
              track('Add analysis', { event: 'Continue to Weights and Reps' });
              // Track movement selected event with the selected movement name
              track('Movement Selected', { name: selectedMovement });
              onUpload();
            }}
            disabled={!selectedMovement}
          >
            <Text
              style={[
                styles.uploadButtonText,
                !selectedMovement && styles.uploadButtonTextDisabled,
              ]}
            >
              {i18n.t('add.continue')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  movementSelectionContainer: {
    flex: 1,
    paddingVertical: 20,
    alignSelf: 'stretch',
  },
  movementSelectionTitle: {
    fontSize: 22,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    textAlign: 'left',
    width: '100%',
  },
  searchInputContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 20,
  },
  searchInput: {
    width: '100%',
    height: 60,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 15,
    paddingRight: 50, // Make room for the clear button
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textAlignVertical: 'center',
  },
  clearButton: {
    position: 'absolute',
    right: 15,
    top: '50%',
    transform: [{ translateY: -15 }], // Center vertically (half of input height)
    padding: 5,
  },
  movementsList: {
    flex: 1,
    width: '100%',
  },
  movementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  movementItemSelected: {
    backgroundColor: '#F0F0F0',
  },
  movementItemText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textAlign: 'left',
  },
  movementItemTextSelected: {
    fontWeight: '600',
  },
  bottomControls: {
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  buttonStack: {
    width: '100%',
  },
  backButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    marginBottom: 10,
  },
  backButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  uploadButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 28,
    width: '100%',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  uploadButtonDisabled: {
    backgroundColor: '#8E8E93',
    opacity: 0.7,
  },
  uploadButtonTextDisabled: {
    color: '#C7C7CC',
  },
  checkmark: {
    marginLeft: 10,
  },
  customMovementText: {
    fontStyle: 'italic',
    color: '#666666',
  },
  // Segmented control styles
  segmentedWrapper: {
    width: '100%',
    marginBottom: 20,
  },
  segmented: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    position: 'relative',
  },
  segmentBackground: {
    position: 'absolute',
    top: 4,
    left: 0,
    bottom: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    // Android elevation
    ...(Platform.OS === 'android' ? { elevation: 2 } : {}),
  },
  segment: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentInactive: {},
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  segmentTextActive: {
    color: '#000',
  },
  segmentTouchable: {
    zIndex: 1,
  },
});
