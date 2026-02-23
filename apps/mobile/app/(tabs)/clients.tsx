import React, { useMemo, useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, Share, ActivityIndicator } from 'react-native';
import { PressableScale } from 'pressto';
import { useRouter } from 'expo-router';
import { ChevronRight, Forward } from 'lucide-react-native';

import { Avatar } from '@/components/ui/avatar';

import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { getOnboardings } from '@/services/coach/coach-onboarding-service';
import { Dialog } from '@/components/ui/dialog';
import { SelectInput } from '@/components/ui/form-inputs';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { fuzzyMatch } from '@/utils/searchUtils';
import { useThemePreference, useCoachProfileStore, useCoachDataStore } from '@/stores';
import { useTranslations } from '@/stores';
import { useTerminology } from '@/hooks/useTerminology';
import { type Athlete } from '@/services/coach/coach-client-service';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { EmptyState } from '@/components/ui/empty-state';

// Memoized list item component for better performance
type ClientListItemProps = {
  client: Athlete;
  onPress: (clientId: string) => void;
  formatSubtitle: (client: Athlete) => string;
  isLastItem: boolean;
  themeColors: any;
  t: any;
};

const ClientListItem = React.memo(function ClientListItem({
  client,
  onPress,
  formatSubtitle,
  isLastItem,
  themeColors,
}: ClientListItemProps) {
  return (
    <View>
      <PressableScale
        onPress={() => onPress(client.id)}
        style={styles.rowWrapper}
      >
        <View style={styles.rowContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Avatar
                uri={client.avatarUrl}
                size={54}
                borderRadius={27}
                fallback={
                  <View
                    style={[
                      styles.avatarImage,
                      styles.avatarPlaceholder,
                      { backgroundColor: themeColors.border },
                    ]}
                  />
                }
              />
            </View>
          </View>
          <View style={styles.clientInfo}>
            <Text
              style={[styles.clientName, { color: themeColors.text }]}
              numberOfLines={1}
            >
              {client.name}
            </Text>
            <Text
              style={[styles.clientSubtitle, { color: themeColors.mutedText }]}
              numberOfLines={2}
            >
              {formatSubtitle(client)}
            </Text>
          </View>
          <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
        </View>
      </PressableScale>
      <View style={styles.separatorContainer}>
        <View
          style={[
            styles.separator,
            { backgroundColor: themeColors.mutedText, opacity: 0.3 },
          ]}
        />
      </View>
      {isLastItem && <View style={{ height: 60 }} />}
    </View>
  );
});

export default function ClientsScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const terminology = useTerminology();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteDialogStep, setInviteDialogStep] = useState<'ask' | 'select'>('ask');
  const [selectedOnboardingId, setSelectedOnboardingId] = useState<string | null>(null);
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const isAuthenticated = !!coachProfile;
  const uniqueCode = coachProfile?.unique_code;

  const { data: onboardings = [] } = useQuery({
    queryKey: ['coach-onboardings'],
    queryFn: getOnboardings,
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
  });

  // Use clients from the store (loaded by (tabs)/_layout.tsx)
  const clients = useCoachDataStore((state) => state.clients);
  const isLoading = useCoachDataStore((state) => state.isLoading);

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) {
      return clients;
    }

    return clients.filter((client) => {
      const fullName = client.name.toLowerCase(); // API returns 'name' not 'fullName'
      const firstName = client.firstName.toLowerCase();
      const lastName = client.lastName.toLowerCase();
      const query = searchQuery.toLowerCase();

      return (
        fuzzyMatch(fullName, query) ||
        fuzzyMatch(firstName, query) ||
        fuzzyMatch(lastName, query)
      );
    });
  }, [clients, searchQuery]);

  const handleClientPress = useCallback((clientId: string) => {
    haptics.medium();
    router.push(`/client/${clientId}`);
  }, [router]);

  const formatSubtitle = useCallback((client: Athlete): string => {
    const parts: string[] = [];

    if (client.age) {
      parts.push(`${client.age} ${t('clients.years')}`);
    }

    // Note: Client type comes as coachingType from API
    if (client.coachingType) {
      const typeLabel =
        client.coachingType === 'in-person'
          ? t('clients.addClientModal.inPerson')
          : client.coachingType === 'online'
            ? t('clients.addClientModal.online')
            : t('clients.addClientModal.hybrid');
      parts.push(typeLabel);
    }

    return parts.join(' · ');
  }, [t]);

  const getInviteLink = useCallback((onboardingId?: string | null) => {
    // TODO: Replace with actual web origin when configured
    const base = `https://app.athli.io/client/invite/${uniqueCode}`;
    if (onboardingId) {
      return `${base}?onboarding=${onboardingId}`;
    }
    return base;
  }, [uniqueCode]);

  const pendingShareRef = useRef<string | null | undefined>(undefined);

  const shareInviteLink = useCallback(async (onboardingId?: string | null) => {
    setIsSharing(true);
    try {
      await Share.share({
        message: getInviteLink(onboardingId),
      });
    } catch (error: any) {
      console.error(error.message);
    } finally {
      setIsSharing(false);
    }
  }, [getInviteLink]);

  const shareAfterDialogClose = useCallback((onboardingId?: string | null) => {
    pendingShareRef.current = onboardingId ?? null;
    setShowInviteDialog(false);
  }, []);

  const handleDialogClosed = useCallback(() => {
    if (pendingShareRef.current !== undefined) {
      const onboardingId = pendingShareRef.current;
      pendingShareRef.current = undefined;
      // Small delay to ensure Modal is fully dismissed on iOS
      setTimeout(() => shareInviteLink(onboardingId), 300);
    }
  }, [shareInviteLink]);

  const handleShare = useCallback(() => {
    haptics.medium();
    if (onboardings.length === 0) {
      shareInviteLink();
    } else {
      setInviteDialogStep('ask');
      setSelectedOnboardingId(null);
      setShowInviteDialog(true);
    }
  }, [onboardings.length, shareInviteLink]);

  const onboardingOptions = useMemo(() =>
    onboardings.map((o) => ({
      value: o.id,
      label: o.name || 'Untitled',
      subtitle: o.description,
    })),
  [onboardings]);

  const renderClientItem = useCallback(({ item: client, index }: { item: Athlete; index: number }) => (
    <ClientListItem
      client={client}
      onPress={handleClientPress}
      formatSubtitle={formatSubtitle}
      isLastItem={index === filteredClients.length - 1}
      themeColors={themeColors}
      t={t}
    />
  ), [handleClientPress, formatSubtitle, filteredClients.length, themeColors, t]);

  const renderEmptyComponent = useCallback(() => (
    <EmptyState message={terminology.noPluralYet} />
  ), [terminology.noPluralYet]);

  return (
    <ScreenWrapper contentContainerStyle={styles.scrollViewContent}>
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: themeColors.text }]}>{terminology.plural}</Text>
            <View style={styles.headerButtonContainer}>
              <IconButton
                icon={{ sf: 'arrowshape.turn.up.forward', IconComponent: Forward }}
                onPress={handleShare}
                size="md"
                color={themeColors.text}
                loading={isSharing}
              />
            </View>
          </View>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('clients.searchPlaceholder')}
          />
        </View>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
          </View>
        ) : (
          <View style={styles.clientListContainer}>
            <FlashList
              data={filteredClients}
              renderItem={renderClientItem}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={renderEmptyComponent}
            />
          </View>
        )}
      </View>

      {/* Invite Link Dialog - Step 1: Ask */}
      {inviteDialogStep === 'ask' && (
        <Dialog
          visible={showInviteDialog}
          onClose={() => setShowInviteDialog(false)}
          onDismiss={handleDialogClosed}
          title={t('clients.inviteDialog.title')}
          message={t('clients.inviteDialog.message')}
          buttonLayout="vertical"
          buttons={[
            {
              label: t('clients.inviteDialog.noJustShare'),
              variant: 'secondary',
              onPress: () => shareAfterDialogClose(),
            },
            {
              label: t('clients.inviteDialog.yesSelect'),
              variant: 'primary',
              onPress: () => setInviteDialogStep('select'),
            },
          ]}
        />
      )}

      {/* Invite Link Dialog - Step 2: Select Onboarding */}
      {inviteDialogStep === 'select' && (
        <Dialog
          visible={showInviteDialog}
          onClose={() => setShowInviteDialog(false)}
          onDismiss={handleDialogClosed}
          title={t('clients.inviteDialog.title')}
          buttonLayout="vertical"
          buttons={[
            {
              label: t('clients.inviteDialog.shareLink'),
              variant: 'primary',
              disabled: !selectedOnboardingId,
              onPress: () => shareAfterDialogClose(selectedOnboardingId),
            },
          ]}
        >
          <View style={{ marginBottom: 8 }}>
            <SelectInput
              label={t('clients.inviteDialog.selectOnboarding')}
              value={selectedOnboardingId}
              onChange={setSelectedOnboardingId}
              options={onboardingOptions}
              placeholder={t('clients.addClientModal.onboardingPlaceholder')}
            />
          </View>
        </Dialog>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    paddingBottom: 120,
    paddingTop: 16,
  },
  container: {
  },
  headerSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  titleRow: {
    position: 'relative',
    marginBottom: 12,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
    paddingRight: 52,
  },
  headerButtonContainer: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: [{ translateY: -22 }],
  },
  rowWrapper: {
    width: '100%',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginRight: 12,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 54,
    height: 54,
  },
  avatarPlaceholder: {
    width: 54,
    height: 54,
  },
  clientInfo: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  clientName: {
    ...typography.p1,
    fontWeight: '600',
    marginBottom: 4,
  },
  clientSubtitle: {
    ...typography.p3,
  },
  separatorContainer: {
    paddingLeft: 82,
    paddingRight: 16,
  },
  separator: {
    height: 0.75,
  },
  clientListContainer: {
  },
  loadingContainer: {
    minHeight: 400,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
});
