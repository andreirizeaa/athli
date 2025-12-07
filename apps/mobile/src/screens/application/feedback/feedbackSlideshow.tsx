import { Image } from 'expo-image';
import * as StoreReview from 'expo-store-review';
import LottieView from 'lottie-react-native';
import { ChevronLeft, ChevronRight, CircleCheck, CircleX, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import ReanimatedAnimated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OrangeGradientButton } from '../../../components/ui/buttons/OrangeGradientButton';
import { useTutorialTarget } from '../../../context/TutorialContext';
import { useUserDetails } from '../../../context/UserDetailsContext';
import { track } from '../../../services/analytics';
import { editUserDetails } from '../../../services/userService';
import { hapticFeedback } from '../../../utils/haptic';
import i18n from '../../../utils/i18n';

// Custom hook to get image aspect ratio from remote URL
function useRemoteImageRatio(uri?: string) {
  const [ratio, setRatio] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!uri) return;
    let cancelled = false;

    RNImage.getSize(
      uri,
      (w, h) => {
        if (!cancelled) setRatio(w / h);
      },
      () => {
        // Ignore errors - fallback to default height
        if (!cancelled) setRatio(null);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [uri]);

  return ratio;
}

// Animated component for how it works items
interface AnimatedHowItWorksItemProps {
  children: React.ReactNode;
  delay: number;
}

function AnimatedHowItWorksItem({ children, delay }: AnimatedHowItWorksItemProps) {
  const translateY = useSharedValue(delay === 0 ? 0 : 30);
  const opacity = useSharedValue(delay === 0 ? 1 : 0);

  React.useEffect(() => {
    // If delay is 0, don't animate - show immediately
    if (delay === 0) return;

    // Animate in with a staggered delay
    translateY.value = withDelay(
      delay,
      withSpring(0, {
        damping: 25,
        stiffness: 200,
        mass: 0.6,
      })
    );

    opacity.value = withDelay(
      delay,
      withSpring(1, {
        damping: 25,
        stiffness: 200,
      })
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  return <ReanimatedAnimated.View style={animatedStyle}>{children}</ReanimatedAnimated.View>;
}

// Animated component for list items (issues/tips)
interface AnimatedListItemProps {
  children: React.ReactNode;
  delay: number;
}

function AnimatedListItem({ children, delay }: AnimatedListItemProps) {
  const translateY = useSharedValue(delay === 0 ? 0 : 30);
  const opacity = useSharedValue(delay === 0 ? 1 : 0);

  React.useEffect(() => {
    // If delay is 0, don't animate - show immediately
    if (delay === 0) return;

    // Animate in with a staggered delay
    translateY.value = withDelay(
      delay,
      withSpring(0, {
        damping: 25,
        stiffness: 200,
        mass: 0.6,
      })
    );

    opacity.value = withDelay(
      delay,
      withSpring(1, {
        damping: 25,
        stiffness: 200,
      })
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  return <ReanimatedAnimated.View style={animatedStyle}>{children}</ReanimatedAnimated.View>;
}

// Animated component for feedback image
interface AnimatedFeedbackImageProps {
  children: React.ReactNode;
  delay: number;
  feedbackIndex: number; // Add feedback index to trigger re-animation
}

function AnimatedFeedbackImage({ children, delay, feedbackIndex }: AnimatedFeedbackImageProps) {
  const translateY = useSharedValue(120); // Always start from below (doubled again)
  const opacity = useSharedValue(0); // Always start invisible

  React.useEffect(() => {
    // Reset to initial state first
    translateY.value = 120;
    opacity.value = 0;

    // Animate in with the specified delay (slower animation)
    translateY.value = withDelay(
      delay,
      withSpring(0, {
        damping: 20, // Reduced damping for slower animation
        stiffness: 120, // Reduced stiffness for slower animation
        mass: 1.0, // Increased mass for slower animation
      })
    );

    opacity.value = withDelay(
      delay,
      withSpring(1, {
        damping: 20, // Reduced damping for slower animation
        stiffness: 120, // Reduced stiffness for slower animation
      })
    );
  }, [delay, feedbackIndex]); // Add feedbackIndex to dependencies

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  return <ReanimatedAnimated.View style={animatedStyle}>{children}</ReanimatedAnimated.View>;
}

interface FeedbackSlideshowProps {
  onClose: () => void;
  onNavigateToLiftDetails?: () => void;
  onNavigateToHome?: () => void;
  onShowHowItWorks?: () => void;
  liftData?: {
    analysis: {
      feedback: Array<{
        imageURL: any;
        flaws: string[];
        improvement: string[];
      }>;
      accuracyScore?: number;
      accuracy?: number;
    };
  };
}

type ScreenMode = 'feedback' | 'accuracyScore';

export function FeedbackSlideshow({
  onClose,
  onNavigateToLiftDetails,
  onNavigateToHome,
  onShowHowItWorks,
  liftData,
}: FeedbackSlideshowProps) {
  const [currentFeedbackIndex, setCurrentFeedbackIndex] = useState(0);
  const [currentPageType, setCurrentPageType] = useState<'image' | 'flaws' | 'improvement'>(
    'image'
  );
  const [isBottomExpanded, setIsBottomExpanded] = useState(false);
  const [screenMode, setScreenMode] = useState<ScreenMode>('feedback');
  const { userDetails, updateHasRated } = useUserDetails();
  const { height: screenHeight } = useWindowDimensions();

  // Animation for right chevron pulsing
  const rightChevronPulse = React.useRef(new Animated.Value(1)).current;
  const [hasClickedRightChevron, setHasClickedRightChevron] = useState(false);

  // Track screen view on mount
  useEffect(() => {
    track('Screen viewed', { screen_name: 'Lift Feedback' });
  }, []);

  // Start continuous pulsing animation for right chevron (only if not clicked yet)
  useEffect(() => {
    if (hasClickedRightChevron) {
      // Stop animation and reset to normal scale
      rightChevronPulse.setValue(1);
      return;
    }

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(rightChevronPulse, {
          toValue: 1.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(rightChevronPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [rightChevronPulse, hasClickedRightChevron]);

  // Track when user is interacting with the bottom ScrollView to avoid stealing gestures
  const interactingWithBottomScrollRef = React.useRef(false);
  const handleBottomScrollTouchStart = React.useCallback(() => {
    interactingWithBottomScrollRef.current = true;
  }, []);
  const handleBottomScrollTouchEnd = React.useCallback(() => {
    interactingWithBottomScrollRef.current = false;
  }, []);
  const handleBottomScrollEndDrag = React.useCallback(() => {
    interactingWithBottomScrollRef.current = false;
  }, []);
  const handleBottomMomentumEnd = React.useCallback(() => {
    interactingWithBottomScrollRef.current = false;
  }, []);

  // Setup slide animation and pan responder for bottom drawer
  const slideAnim = React.useRef(new Animated.Value(390)).current; // start collapsed (panel mostly hidden, only header showing)
  const currentSlidePosition = React.useRef(390); // track current position for pan responder

  // Tap toggle for bottom container
  const toggleBottomContainer = React.useCallback(() => {
    hapticFeedback.selection();
    const currentPos = currentSlidePosition.current;
    // If fully expanded, move to peek (200) without collapsing fully
    if (currentPos === 0) {
      Animated.timing(slideAnim, {
        toValue: 390,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // Keep expanded state true; we're just peeking
        currentSlidePosition.current = 200;
      });
      return;
    }
    // If at peek, expand fully
    if (currentPos === 200) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        currentSlidePosition.current = 0;
      });
      return;
    }
    // If fully collapsed, expand fully
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIsBottomExpanded(true);
      currentSlidePosition.current = 0;
    });
  }, [slideAnim]);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        // Do not start pan responder if user is touching the ScrollView content
        if (interactingWithBottomScrollRef.current) return false;
        return false;
      },
      onMoveShouldSetPanResponder: (_: any, gestureState: any) => {
        // If interacting with ScrollView, don't capture; let ScrollView handle
        if (interactingWithBottomScrollRef.current) return false;
        // start gesture if vertical swipe > horizontal
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_: any, gestureState: any) => {
        if (isBottomExpanded) {
          // When expanded, allow dragging both up and down
          if (gestureState.dy < 0) {
            // Dragging up - collapse the panel
            const newY = Math.max(gestureState.dy, -390); // limit to 0 (fully expanded)
            slideAnim.setValue(newY);
          } else if (gestureState.dy > 0) {
            // Dragging down - show just the top of expanded content
            const newY = Math.min(gestureState.dy, 200); // limit to 200 (showing just top portion)
            slideAnim.setValue(newY);
          }
        } else {
          // When collapsed, only allow dragging up to expand
          if (gestureState.dy < 0) {
            const newY = Math.max(gestureState.dy + 390, 0); // start from 390, limit to 0
            slideAnim.setValue(newY);
          }
        }
      },
      onPanResponderRelease: (_: any, gestureState: any) => {
        if (isBottomExpanded) {
          if (gestureState.dy < -100) {
            // swipe up → collapse
            Animated.timing(slideAnim, {
              toValue: 390,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              setIsBottomExpanded(false);
              currentSlidePosition.current = 390;
            });
          } else if (gestureState.dy > 100) {
            // swipe down → show just top portion
            Animated.timing(slideAnim, {
              toValue: 200,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              currentSlidePosition.current = 200;
            });
          } else {
            // snap back to expanded
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              currentSlidePosition.current = 0;
            });
          }
        } else {
          // When collapsed, only allow expanding by dragging up
          if (gestureState.dy < -100) {
            // swipe up → expand
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              setIsBottomExpanded(true);
              currentSlidePosition.current = 0;
            });
          } else {
            // snap back to collapsed
            Animated.timing(slideAnim, {
              toValue: 390,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              currentSlidePosition.current = 390;
            });
          }
        }
      },
    })
  ).current;

  // Tutorial targets for the feedback slideshow
  const { ref: feedbackSlideshowRef } = useTutorialTarget('feedback_slideshow');
  const { ref: issuesRef } = useTutorialTarget('feedback_issues');
  const { ref: tipsRef } = useTutorialTarget('feedback_tips');

  // Initialize slideAnim position based on current state
  React.useEffect(() => {
    if (currentPageType === 'image') {
      Animated.timing(slideAnim, {
        toValue: 390, // collapsed
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        currentSlidePosition.current = 390;
      });
    } else {
      const targetValue = isBottomExpanded ? 0 : 390;
      Animated.timing(slideAnim, {
        toValue: targetValue,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        currentSlidePosition.current = targetValue;
      });
    }
  }, [currentPageType, isBottomExpanded, slideAnim]);

  const handleClose = () => {
    hapticFeedback.selection();
    // If onNavigateToLiftDetails is provided, use it to go back to lift details
    // Otherwise, fall back to the default onClose behavior
    if (onNavigateToLiftDetails) {
      onNavigateToLiftDetails();
    } else {
      onClose();
    }
  };

  const handleExitToLiftDetails = async () => {
    hapticFeedback.selection();
    if (!userDetails?.hasRated) {
      if (await StoreReview.isAvailableAsync) {
        await StoreReview.requestReview();
        updateHasRated(true);
        editUserDetails({ has_rated: true });
      }
    }
    // Navigate back to lift details
    if (onNavigateToLiftDetails) {
      onNavigateToLiftDetails();
    } else {
      onClose();
    }
  };

  const handleLeftChevron = () => {
    hapticFeedback.selection();
    navigateBackward();
  };

  const handleRightChevron = () => {
    hapticFeedback.selection();
    setHasClickedRightChevron(true);
    navigateForward();
  };

  // Expose navigation functions globally for tutorial
  React.useEffect(() => {
    global.navigateToIssues = () => {
      if (currentPageType === 'image') {
        setCurrentPageType('flaws');
        setIsBottomExpanded(true);
        Animated.timing(slideAnim, {
          toValue: 0, // expand
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          currentSlidePosition.current = 0;
        });
      } else if (currentPageType === 'improvement') {
        setCurrentPageType('flaws');
        setIsBottomExpanded(true);
        // Already expanded, no animation needed
      }
    };

    global.navigateToTips = () => {
      if (currentPageType === 'flaws') {
        setCurrentPageType('improvement');
        setIsBottomExpanded(true);
        // Already expanded, no animation needed
      }
    };

    global.navigateToImage = () => {
      if (currentPageType === 'flaws') {
        setCurrentPageType('image');
        setIsBottomExpanded(false);
        Animated.timing(slideAnim, {
          toValue: 390, // collapse
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          currentSlidePosition.current = 390;
        });
      }
    };

    global.navigateToFeedbackPage = () => {
      setScreenMode('feedback');
      // Notify tutorial that the component is ready to continue
      // Use a longer delay to ensure the component is fully rendered
      setTimeout(() => {
        if (global.onFeedbackPageReady) global.onFeedbackPageReady();
      }, 800);
    };

    const previousNavigateToHome = (global as any).navigateToHome;
    (global as any).navigateToHome = () => {
      if (onNavigateToHome) {
        (global as any).__lastHomeNavAt = Date.now();
        onNavigateToHome();
        return;
      }
      if ((global as any).__navigateToHomeBase) {
        (global as any).__navigateToHomeBase();
        return;
      }
      if (onClose) onClose();
    };

    return () => {
      delete global.navigateToIssues;
      delete global.navigateToTips;
      delete global.navigateToImage;
      delete global.navigateToFeedbackPage;
      // Restore previous handler or fallback to base
      if (previousNavigateToHome) {
        (global as any).navigateToHome = previousNavigateToHome;
      } else if ((global as any).__navigateToHomeBase) {
        (global as any).navigateToHome = (global as any).__navigateToHomeBase;
      } else {
        delete (global as any).navigateToHome;
      }
      delete global.onFeedbackPageReady;
    };
  }, [currentPageType, onClose, onNavigateToHome]);

  const navigateForward = () => {
    if (!liftData?.analysis?.feedback) return;

    const totalFeedbackItems = liftData.analysis.feedback.length;

    if (currentPageType === 'image') {
      setCurrentPageType('flaws');
      setIsBottomExpanded(true);
      Animated.timing(slideAnim, {
        toValue: 0, // expand
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        currentSlidePosition.current = 0;
      });
    } else if (currentPageType === 'flaws') {
      setCurrentPageType('improvement');
      setIsBottomExpanded(true);
      // Already expanded, no animation needed
    } else if (currentPageType === 'improvement') {
      // Move to next feedback item
      if (currentFeedbackIndex < totalFeedbackItems - 1) {
        setCurrentFeedbackIndex(currentFeedbackIndex + 1);
        setCurrentPageType('image');
        setIsBottomExpanded(false);
        Animated.timing(slideAnim, {
          toValue: 390, // collapse
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          currentSlidePosition.current = 390;
        });
      } else {
        // We're on the last feedback item's improvement page, show accuracy score page
        hapticFeedback.success();
        setScreenMode('accuracyScore');
      }
    }
  };

  const navigateBackward = () => {
    if (!liftData?.analysis?.feedback) return;

    if (currentPageType === 'image') {
      // Move to previous feedback item's improvement page
      if (currentFeedbackIndex > 0) {
        setCurrentFeedbackIndex(currentFeedbackIndex - 1);
        setCurrentPageType('improvement');
        setIsBottomExpanded(true);
        Animated.timing(slideAnim, {
          toValue: 0, // expand
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          currentSlidePosition.current = 0;
        });
      } else {
        // We're on the first page, go back to previous screen
        // Use onNavigateToLiftDetails if available, otherwise fall back to onClose
        if (onNavigateToLiftDetails) {
          onNavigateToLiftDetails();
        } else {
          onClose();
        }
      }
    } else if (currentPageType === 'flaws') {
      setCurrentPageType('image');
      setIsBottomExpanded(false);
      Animated.timing(slideAnim, {
        toValue: 390, // collapse
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        currentSlidePosition.current = 390;
      });
    } else if (currentPageType === 'improvement') {
      setCurrentPageType('flaws');
      setIsBottomExpanded(true);
      // Already expanded, no animation needed
    }
  };

  const getCurrentFeedbackItem = () => {
    if (!liftData?.analysis?.feedback) return null;
    return liftData.analysis.feedback[currentFeedbackIndex];
  };

  const getCurrentPageNumber = () => {
    if (!liftData?.analysis?.feedback) return 0;
    const totalFeedbackItems = liftData.analysis.feedback.length;
    const totalPages = totalFeedbackItems * 3;
    return currentFeedbackIndex * 3 + getPageTypeIndex(currentPageType) + 1;
  };

  const getTotalPages = () => {
    if (!liftData?.analysis?.feedback) return 0;
    return liftData.analysis.feedback.length * 3;
  };

  const getPageTypeIndex = (pageType: 'image' | 'flaws' | 'improvement') => {
    switch (pageType) {
      case 'image':
        return 0;
      case 'flaws':
        return 1;
      case 'improvement':
        return 2;
    }
  };

  const getPageTitle = () => {
    return `Feedback point ${currentFeedbackIndex + 1}`;
  };

  const getBottomContent = () => {
    const feedbackItem = getCurrentFeedbackItem();
    if (!feedbackItem) return null;

    if (currentPageType === 'image' || !isBottomExpanded) {
      return null; // No content in bottom container for image view or when collapsed
    }

    const isIssues = currentPageType === 'flaws';
    const listRaw = isIssues ? feedbackItem.flaws : feedbackItem.improvement;
    const items: string[] = Array.isArray(listRaw)
      ? (listRaw as unknown as string[])
      : typeof listRaw === 'string'
        ? (listRaw as string)
            .split(/\n+/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    return (
      <View style={styles.bottomContentContainer} ref={isIssues ? issuesRef : tipsRef}>
        <Text style={styles.bottomContentTitle}>{isIssues ? 'Issues' : 'Tips'}</Text>
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
          onTouchStart={handleBottomScrollTouchStart}
          onTouchEnd={handleBottomScrollTouchEnd}
          onScrollBeginDrag={handleBottomScrollTouchStart}
          onScrollEndDrag={handleBottomScrollEndDrag}
          onMomentumScrollEnd={handleBottomMomentumEnd}
        >
          <View style={styles.listContainer}>
            {items.map((text, idx) => {
              // Add 500ms delay for issues to let container slide up first
              const baseDelay = isIssues ? 250 : 0;
              const itemDelay = baseDelay + idx * 100;

              return (
                <AnimatedListItem key={`${isIssues ? 'issue' : 'tip'}-${idx}`} delay={itemDelay}>
                  <View style={styles.listItem}>
                    {isIssues ? (
                      <CircleX size={20} color="#FF3B30" />
                    ) : (
                      <CircleCheck size={20} color="#00c950" />
                    )}
                    <Text style={styles.listItemText}>{text}</Text>
                  </View>
                </AnimatedListItem>
              );
            })}
            {items.length === 0 && (
              <AnimatedListItem delay={isIssues ? 500 : 0}>
                <Text style={styles.bottomContentText}>
                  No {isIssues ? 'issues' : 'tips'} provided.
                </Text>
              </AnimatedListItem>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  const feedbackItem = getCurrentFeedbackItem();

  // Get image URI and aspect ratio
  const imageUri =
    feedbackItem && typeof feedbackItem.imageURL === 'string' ? feedbackItem.imageURL : undefined;
  const imageRatio = useRemoteImageRatio(imageUri);

  // Render Accuracy Score screen
  if (screenMode === 'accuracyScore') {
    const accuracyScore = Math.round(
      liftData?.analysis?.accuracyScore || liftData?.analysis?.accuracy || 85
    ); // Round to 0dp, default to 85 if not provided

    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Analysis Complete</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <X size={24} color="#000000" />
            </TouchableOpacity>
          </View>

          {/* Content Area */}
          <View style={styles.content}>
            <View style={styles.accuracyScoreContainer}>
              {/* Confetti animation positioned behind content */}
              <View style={styles.animationContainer}>
                <LottieView
                  source={require('../../../../assets/animations/confetti.json')}
                  autoPlay
                  loop={false}
                  speed={0.7}
                  style={styles.confettiAnimation}
                />
              </View>

              <View style={styles.accuracyScoreContent}>
                {/* Large Accuracy Score Display */}
                <Text style={styles.largeScoreValue}>{accuracyScore}%</Text>
                <Text style={styles.accuracyScoreLabel}>{i18n.t('feedback.accuracyScore')}</Text>
              </View>
            </View>
          </View>

          {/* Bottom Button */}
          <View style={styles.bottomContainer}>
            <OrangeGradientButton
              title="Exit"
              onPress={handleExitToLiftDetails}
              style={styles.exitButton}
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Render Feedback Slideshow screen
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{getPageTitle()}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Content Area - Always full height */}
        <View style={styles.content}>
          {feedbackItem && (
            <AnimatedFeedbackImage delay={0} feedbackIndex={currentFeedbackIndex}>
              <View style={styles.imageContainer} ref={feedbackSlideshowRef}>
                <Image
                  source={imageUri ? { uri: imageUri } : feedbackItem.imageURL}
                  style={[
                    styles.feedbackImage,
                    { width: '100%' },
                    imageRatio
                      ? { aspectRatio: imageRatio, maxHeight: screenHeight * 0.5 }
                      : { height: 220 },
                  ]}
                  contentFit="contain"
                />
              </View>
            </AnimatedFeedbackImage>
          )}
        </View>

        {/* Bottom Navigation Section - Overlays on top */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            marginBottom: currentPageType === 'image' ? 24 : 0, // Only add bottom spacing when closed
          }}
        >
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.bottomNavigationSection,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Top Line when expanded on issues/tips */}
            {(currentPageType === 'flaws' || currentPageType === 'improvement') &&
              isBottomExpanded && (
                <TouchableOpacity
                  style={styles.topMinusIcon}
                  activeOpacity={0.8}
                  onPress={toggleBottomContainer}
                  hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
                >
                  <View style={styles.topLine} />
                </TouchableOpacity>
              )}

            {/* Bottom Content - Above navigation when expanded */}
            {getBottomContent()}

            {/* Navigation Row - Only show when fully expanded or collapsed, not in intermediate state */}
            <Animated.View
              style={[
                styles.navigationRow,
                {
                  opacity: slideAnim.interpolate({
                    inputRange: [0, 150, 200, 390],
                    outputRange: [1, 0, 0, 1], // visible at 0 (expanded) and 390 (collapsed), hidden in between
                  }),
                },
              ]}
            >
              {/* Question mark button on first feedback image, left chevron otherwise */}
              {currentFeedbackIndex === 0 && currentPageType === 'image' ? (
                <TouchableOpacity
                  style={styles.bottomChevron}
                  onPress={() => {
                    hapticFeedback.selection();
                    onShowHowItWorks?.();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.questionMarkText}>?</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.bottomChevron}
                  onPress={handleLeftChevron}
                  activeOpacity={0.7}
                >
                  <ChevronLeft size={24} color="#000000" />
                </TouchableOpacity>
              )}

              {/* Center Column - Page Indicator and Expand/Collapse */}
              <View style={styles.centerColumn}>
                {/* Tappable line above page indicator when collapsed on issues/tips */}
                {(currentPageType === 'flaws' || currentPageType === 'improvement') &&
                  !isBottomExpanded && (
                    <TouchableOpacity
                      style={styles.expandCollapseButton}
                      activeOpacity={0.8}
                      onPress={toggleBottomContainer}
                      hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
                    >
                      <View style={styles.topLine} />
                    </TouchableOpacity>
                  )}
                {/* Page Indicator */}
                <View style={styles.bottomPageIndicator}>
                  <Text style={styles.bottomPageIndicatorText}>
                    {getCurrentPageNumber()} / {getTotalPages()}
                  </Text>
                </View>
              </View>

              {/* Right Chevron */}
              <Animated.View
                style={{
                  transform: [{ scale: rightChevronPulse }],
                }}
              >
                <TouchableOpacity
                  style={styles.bottomChevron}
                  onPress={handleRightChevron}
                  activeOpacity={0.7}
                >
                  <ChevronRight size={24} color="#000000" />
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>

            {/* Bottom padding spacer - only visible when collapsed (image page) */}
            {currentPageType === 'image' && (
              <View style={{ height: 24, backgroundColor: '#FFFFFF' }} />
            )}
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 26,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  bottomNavigationSection: {
    height: 480, // fixed max height
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    marginBottom: 0,
  },
  topMinusIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 8,
    paddingHorizontal: 2,
  },
  topLine: {
    width: 40,
    height: 2.5,
    backgroundColor: '#000000',
    borderRadius: 28,
  },
  bottomChevron: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    maxWidth: 44,
  },
  questionMarkText: {
    fontSize: 24,
    fontWeight: '400',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  bottomPageIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    flex: 1,
    maxWidth: 100,
  },
  bottomPageIndicatorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  bottomContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  listContainer: {
    gap: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  listItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    flexShrink: 1,
  },
  bottomContentTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 12,
    marginTop: 12,
  },
  bottomContentText: {
    fontSize: 18,
    fontWeight: '400',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    lineHeight: 26,
  },
  // How It Works styles
  howItWorksContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40, // Increased padding to center better
  },
  howItWorksItems: {
    width: '100%',
  },
  howItWorksItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 44,
  },
  howItWorksIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  howItWorksNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  howItWorksContent: {
    flex: 1,
  },
  howItWorksText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    lineHeight: 24,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  viewFeedbackButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewFeedbackButtonText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 120, // Increased to account for closed bottom navigation section
  },
  imageContainer: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 20,
    backgroundColor: '#000', // nice letterbox for landscape
  },
  feedbackImage: {
    // Let aspect ratio determine height, no fixed heights
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  centerColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    position: 'relative',
  },
  expandCollapseButton: {
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  tutorialRefContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
  // Accuracy Score styles
  accuracyScoreContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'relative',
    paddingTop: 60, // Add some top padding to center better
  },
  animationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1, // Ensure it's behind other content
  },
  confettiAnimation: {
    width: 700,
    height: 700,
  },
  accuracyScoreContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1, // Ensure it's above the animation
  },
  largeScoreValue: {
    fontSize: 100,
    fontWeight: '800',
    color: '#fe9a00',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    textAlign: 'center',
    marginBottom: 6,
  },
  accuracyScoreLabel: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    textAlign: 'center',
  },
  exitButton: {
    width: '100%',
  },
});
