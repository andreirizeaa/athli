import React, { useRef, useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams, usePathname } from 'expo-router';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';

import { useAppView } from '@/stores';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { typography } from '@/constants/typography';
import { AddClientContent, type AddClientContentRef } from '@/components/features/clients/add-client-content';
import { NewChatContent } from '@/components/features/chats/new-chat-content';
import { IconButton } from '@/components/ui/icon-button';
import { hexToRgba } from '@/utils/colorUtils';

export default function AddModalContent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ route?: string }>();
  const pathname = usePathname();
  const { appView } = useAppView();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const clientContentRef = useRef<AddClientContentRef>(null);
  const [canCompleteClient, setCanCompleteClient] = useState(false);
  const [isLoadingClient, setIsLoadingClient] = useState(false);

  // Determine which content to show based on route param or pathname
  const getCurrentRoute = (): 'clients' | 'chats' => {
    // First check if route was passed as param
    if (params.route === 'clients' || params.route === 'chats') {
      return params.route;
    }

    // Fallback: check pathname (this might not work when already on modal page)
    // So we'll rely on the param being passed
    if (pathname.includes('/clients')) {
      return 'clients';
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
      : t('chats.newChat.title');

  const handleClose = () => {
    // Simply go back once (used by fallback tab bar)
    if (router.canGoBack()) {
      router.back();
    } else {
      // If no history, navigate to appropriate tab based on current route
      router.replace('/clients');
    }
  };

  const handleCompleteClient = async () => {
    if (clientContentRef.current?.canComplete) {
      await clientContentRef.current.handleComplete();
    }
  };

  // Check canComplete and loading state for clients route
  useEffect(() => {
    if (currentRoute === 'clients') {
      const checkState = () => {
        if (clientContentRef.current) {
          setCanCompleteClient(clientContentRef.current.canComplete);
          setIsLoadingClient(clientContentRef.current.isLoading);
        }
      };
      // Check immediately and then periodically
      checkState();
      const interval = setInterval(checkState, 200);
      return () => clearInterval(interval);
    } else {
      setCanCompleteClient(false);
      setIsLoadingClient(false);
    }
  }, [currentRoute]);

  const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
  const gradientHeight = headerHeight + 12;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
      {/* Fixed Header with Blur Gradient */}
      <View style={[styles.fixedHeader, { height: headerHeight }]}>
        <LinearGradient
          colors={[
            hexToRgba(themeColors.backgroundSecondary, 1),
            hexToRgba(themeColors.backgroundSecondary, 0.85),
            hexToRgba(themeColors.backgroundSecondary, 0.5),
            hexToRgba(themeColors.backgroundSecondary, 0),
          ]}
          locations={[0, 0.5, 0.8, 1]}
          style={[styles.headerGradient, { height: gradientHeight }]}
          pointerEvents="none"
        />
        <View
          style={[
            styles.header,
            {
              paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12,
            },
          ]}
        >
          <IconButton
            icon={{ sf: 'xmark', IconComponent: X }}
            onPress={handleClose}
            size="md"
            color={themeColors.text}
          />
          <Text style={[styles.title, { color: themeColors.text }]}>{title}</Text>
          {currentRoute === 'clients' ? (
            <IconButton
              icon={{ sf: 'checkmark', IconComponent: Check }}
              onPress={handleCompleteClient}
              size="md"
              variant={canCompleteClient ? 'primary' : 'default'}
              disabled={!canCompleteClient}
              loading={isLoadingClient}
            />
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {currentRoute === 'clients' ? (
          <View style={styles.clientContentWrapper}>
            <AddClientContent
              ref={clientContentRef}
              onClose={handleClose}
              headerHeight={headerHeight}
            />
          </View>
        ) : (
          <NewChatContent onClose={handleClose} headerHeight={headerHeight} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
  placeholder: {
    width: 44,
    height: 44,
  },
  content: {
    flex: 1,
  },
  clientContentWrapper: {
    flex: 1,
    paddingHorizontal: 0,
  },
});
