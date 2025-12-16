import React, { useRef, useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams, usePathname } from 'expo-router';
import { View, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { X, Check } from 'lucide-react-native';

import { useAppView } from '@/contexts/useAppView';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { typography, iconSizes } from '@/constants/typography';
import { AddClientContent, type AddClientContentRef } from '@/components/clients/add-client-content';
import { NewSessionContent, type NewSessionContentRef } from '@/components/calendar/new-session-content';
import { NewChatContent } from '@/components/chats/new-chat-content';
import { PlatformIcon } from '@/components/platform-icon';
import { IconButton } from '@/components/icon-button';

export default function AddModalContent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ route?: string }>();
  const pathname = usePathname();
  const { appView } = useAppView();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const sessionContentRef = useRef<NewSessionContentRef>(null);
  const clientContentRef = useRef<AddClientContentRef>(null);
  const [canCompleteSession, setCanCompleteSession] = useState(false);
  const [canCompleteClient, setCanCompleteClient] = useState(false);

  // Determine which content to show based on route param or pathname
  const getCurrentRoute = (): 'clients' | 'calendar' | 'chats' => {
    // First check if route was passed as param
    if (params.route === 'clients' || params.route === 'calendar' || params.route === 'chats') {
      return params.route;
    }

    // Fallback: check pathname (this might not work when already on modal page)
    // So we'll rely on the param being passed
    if (pathname.includes('/clients')) {
      return 'clients';
    }
    if (pathname.includes('/calendar')) {
      return 'calendar';
    }
    if (pathname.includes('/chats')) {
      return 'chats';
    }

    // Default to clients for coach view
    return appView === 'coach' ? 'clients' : 'clients';
  };

  const currentRoute = getCurrentRoute();
  const title =
    currentRoute === 'clients'
    ? t('clients.addClientModal.title')
      : currentRoute === 'calendar'
        ? t('calendar.newSession.title')
        : t('chats.newChat.title');

  const handleClose = () => {
    // Simply go back once (used by fallback tab bar)
    if (router.canGoBack()) {
      router.back();
    } else {
      // If no history, navigate to appropriate tab based on current route
      const fallbackRoute = currentRoute === 'calendar' ? '/calendar' : '/clients';
      router.replace(fallbackRoute);
    }
  };

  const handleCompleteSession = async () => {
    if (sessionContentRef.current?.canComplete) {
      await sessionContentRef.current.handleComplete();
    }
  };

  const handleCompleteClient = async () => {
    if (clientContentRef.current?.canComplete) {
      await clientContentRef.current.handleComplete();
    }
  };

  // Check canComplete for calendar and clients routes
  useEffect(() => {
    if (currentRoute === 'calendar') {
      const checkCanComplete = () => {
        if (sessionContentRef.current) {
          setCanCompleteSession(sessionContentRef.current.canComplete);
        }
      };
      // Check immediately and then periodically
      checkCanComplete();
      const interval = setInterval(checkCanComplete, 200);
      return () => clearInterval(interval);
    } else if (currentRoute === 'clients') {
      const checkCanComplete = () => {
        if (clientContentRef.current) {
          setCanCompleteClient(clientContentRef.current.canComplete);
        }
      };
      // Check immediately and then periodically
      checkCanComplete();
      const interval = setInterval(checkCanComplete, 200);
      return () => clearInterval(interval);
    } else {
      setCanCompleteSession(false);
      setCanCompleteClient(false);
    }
  }, [currentRoute]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 20 + insets.top : 20, backgroundColor: themeColors.background }]}>
        <IconButton
          icon={{ sf: 'xmark', IconComponent: X }}
          onPress={handleClose}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.title, { color: themeColors.text }]}>{title}</Text>
        {currentRoute === 'calendar' ? (
          <IconButton
            icon={{ sf: 'checkmark', IconComponent: Check }}
            onPress={handleCompleteSession}
            size="md"
            color={canCompleteSession ? themeColors.primary : themeColors.mutedText}
            disabled={!canCompleteSession}
            activeOpacity={canCompleteSession ? 0.7 : 1}
            style={!canCompleteSession ? { opacity: 0.5 } : undefined}
          />
        ) : currentRoute === 'clients' ? (
          <IconButton
            icon={{ sf: 'checkmark', IconComponent: Check }}
            onPress={handleCompleteClient}
            size="md"
            color={canCompleteClient ? themeColors.primary : themeColors.mutedText}
            disabled={!canCompleteClient}
            activeOpacity={canCompleteClient ? 0.7 : 1}
            style={!canCompleteClient ? { opacity: 0.5 } : undefined}
          />
        ) : (
          <View style={styles.closeButton} />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {currentRoute === 'clients' ? (
          <View style={styles.clientContentWrapper}>
            <AddClientContent ref={clientContentRef} onClose={handleClose} />
          </View>
        ) : currentRoute === 'calendar' ? (
          <View style={styles.sessionContentWrapper}>
            <NewSessionContent ref={sessionContentRef} onClose={handleClose} />
          </View>
        ) : (
          <NewChatContent onClose={handleClose} />
        )}
      </View>
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
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  sessionContentWrapper: {
    flex: 1,
    paddingHorizontal: 16,
  },
  clientContentWrapper: {
    flex: 1,
    paddingHorizontal: 0,
  },
});
