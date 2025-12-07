/**
 * App Color Scheme
 * Centralized color definitions for the entire app
 */

export const appColors = {
  // General colors used across the app
  general: {
    // Background colors
    background: '#FFFFFF',
    darkBackground: '#1d293d', // Keep for specific elements that need dark background

    // Text colors
    title: '#000000',
    subtitle: '#8E8E93',

    // Container colors
    container: {
      background: '#FFFFFF',
      cardBackground: '#F0F0F0',
    },

    // Border colors
    border: {
      light: '#E5E5EA',
      medium: '#D1D1D6',
    },

    // Shadow colors
    shadow: {
      light: 'rgba(0, 0, 0, 0.1)',
      medium: 'rgba(0, 0, 0, 0.2)',
    },
  },

  // Onboarding specific colors
  onboarding: {
    // Button colors
    button: {
      active: {
        background: '#000000',
        text: '#FFFFFF',
        iconBackground: '#F0F0F0',
        iconColor: '#000000',
      },
      inactive: {
        background: '#F0F0F0',
        text: '#000000',
        iconBackground: '#FFFFFF',
        iconColor: '#000000',
      },
    },

    // Comparison container colors
    comparison: {
      gradient: {
        colors: ['#e2e8f0', '#faf5ff'],
        locations: [0, 0.9],
        start: { x: 0.5, y: 0 },
        end: { x: 0, y: 1 },
      },
      whiteBox: {
        background: '#FFFFFF',
        shadow: 'rgba(0, 0, 0, 0.08)',
      },
      sectionTitle: '#000000',
      percentageBox: {
        background: '#f0f0f0',
        text: '#000000',
      },
      formaiBox: {
        background: '#000000',
        text: '#FFFFFF',
      },
      description: '#000000',
      source: {
        text: '#8E8E93',
      },
    },

    // Gym challenge info colors
    gymChallengeInfo: {
      gradient: {
        colors: ['#e2e8f0', '#faf5ff'],
        locations: [0, 0.9],
        start: { x: 0.5, y: 0 },
        end: { x: 0, y: 1 },
      },
      headline: '#000000',
      message: '#000000',
      howWeGetYouThereTitle: '#000000',
      card: {
        background: 'transparent',
        border: '#f0f0f0',
        iconBackground: '#F0F0F0',
        iconText: '#000000',
        text: '#000000',
      },
    },

    // Perfect form goal message colors
    perfectFormGoalMessage: {
      title: '#000000',
      highlightedText: '#fe9a00',
      subtitle: '#8E8E93',
    },

    // Graph colors
    graph: {
      gradient: {
        colors: ['#e2e8f0', '#faf5ff'],
        locations: [0, 0.9],
        start: { x: 0.5, y: 0 },
        end: { x: 0, y: 1 },
      },
      title: '#000000',
      subtitle: '#000000',
      chart: {
        background: '#ffffff',
        lineColor: '#000000',
        dotColor: '#000000',
        labelColor: '#000000',
        trophyBackground: '#fe9a00',
        trophyBorder: '#FFFFFF',
      },
    },

    // Permission container colors
    permission: {
      title: '#000000',
      dialog: {
        background: '#FFFFFF',
        shadow: '#000000',
      },
      textArea: {
        background: '#F0F0F0',
        text: '#000000',
      },
      buttonContainer: {
        border: '#E5E5EA',
      },
      button: {
        dontAllow: {
          background: '#F0F0F0',
          text: '#000000',
        },
        allow: {
          background: '#000000',
          text: '#FFFFFF',
        },
        divider: '#FFFFFF',
      },
    },

    // Measurements colors
    measurements: {
      pickerLabel: '#000000',
      picker: {
        text: '#000000',
        itemText: '#000000',
        dropdownIcon: '#000000',
      },
    },

    // All done screen colors
    allDone: {
      allDoneText: '#000000',
      thankYouText: '#000000',
      privacyText: '#000000',
      checkmarkColor: '#34C759',
    },

    // Sign-in screens colors
    signIn: {
      background: '#FFFFFF',
      title: '#000000',
      closeButton: '#000000',
      divider: '#000000',
      appleButton: {
        background: '#000000',
        text: '#FFFFFF',
        iconTint: '#FFFFFF',
      },
      googleButton: {
        background: '#FFFFFF',
        text: '#000000',
        border: '#000000',
      },
      terms: {
        text: '#8E8E93',
        link: '#000000',
      },
      loading: {
        background: 'rgba(0, 0, 0, 0.7)',
        container: 'rgba(50, 50, 50, 0.95)',
        indicator: '#FFFFFF',
      },
    },

    // Welcome screen colors
    welcome: {
      background: '#FFFFFF',
      languagePill: {
        background: '#FFFFFF',
        text: '#000000',
        shadow: '#000000',
      },
      content: {
        background: '#FFFFFF',
      },
      subtitle: '#000000',
      haveAccountText: '#000000',
      signInLink: '#000000',
      modal: {
        overlay: 'rgba(0, 0, 0, 0.5)',
        background: '#FFFFFF',
        title: '#000000',
        closeButton: '#000000',
        closeButtonBorder: '#E5E5EA',
        languageButton: {
          selected: {
            background: '#000000',
            text: '#FFFFFF',
          },
          unselected: {
            background: '#F0F0F0',
            text: '#000000',
          },
        },
      },
    },
  },

  // Main app colors (for future use)
  mainApp: {
    // Add main app specific colors here
    // This section is reserved for colors used in the main app outside of onboarding
  },
} as const;

export type AppColors = typeof appColors;
