import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PressableOpacity } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { Separator } from '@/components/ui/separator';
import { SearchBar } from '@/components/ui/search-bar';
import { Dialog } from '@/components/ui/dialog';
import { hexToRgba } from '@/utils/colorUtils';
import {
  TIMEZONE_OPTIONS,
  type TimezoneOption,
} from '@athli/shared-types';

/** Strip the "(UTC+XX:XX) " prefix from timezone labels */
const stripUtcPrefix = (label: string) => label.replace(/^\(UTC[^)]*\)\s*/, '');

type TimezonePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void | Promise<void>;
  selectedTimezone: string | null;
  title?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  /** When true, show a confirm button in the header instead of auto-closing on select */
  confirmable?: boolean;
};

export const TimezonePickerModal = ({
  visible,
  onClose,
  onSelect,
  selectedTimezone,
  title = 'Select Timezone',
  searchQuery,
  onSearchChange,
  confirmable = false,
}: TimezonePickerModalProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRef = useRef<any>(null);

  // Local selection state for confirmable mode
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset pending selection when modal opens
  useEffect(() => {
    if (visible) {
      setPendingSelection(selectedTimezone);
    }
  }, [visible, selectedTimezone]);

  const activeSelection = confirmable ? pendingSelection : selectedTimezone;

  const hasChanges = confirmable && pendingSelection !== selectedTimezone;

  const handleConfirm = useCallback(async () => {
    if (!pendingSelection) return;
    setIsSaving(true);
    try {
      await onSelect(pendingSelection);
    } finally {
      setIsSaving(false);
    }
  }, [pendingSelection, onSelect]);

  const handleCloseWithConfirmation = useCallback(() => {
    if (hasChanges) {
      setShowDiscardDialog(true);
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  // Scroll to top when search query changes
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [searchQuery]);

  // Filter and sort timezones - selected at top, then default order, filtered by search
  const filteredTimezones = useMemo(() => {
    let filtered = TIMEZONE_OPTIONS;

    // Filter by search query (label or value)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = TIMEZONE_OPTIONS.filter(
        (tz) =>
          tz.label.toLowerCase().includes(query) ||
          tz.value.toLowerCase().includes(query)
      );
    }

    // Sort with originally selected timezone at top (don't reorder on tap)
    if (selectedTimezone) {
      const selected = filtered.find((tz) => tz.value === selectedTimezone);
      const others = filtered.filter((tz) => tz.value !== selectedTimezone);
      if (selected) {
        return [selected, ...others];
      }
    }

    return filtered;
  }, [searchQuery, selectedTimezone]);

  const handleSelectTimezone = useCallback(
    (tz: TimezoneOption) => {
      if (confirmable) {
        setPendingSelection(tz.value);
      } else {
        onSelect(tz.value);
      }
    },
    [onSelect, confirmable]
  );

  const renderItem = useCallback(
    ({ item }: { item: TimezoneOption }) => {
      const isSelected = activeSelection === item.value;

      return (
        <PressableOpacity
          style={styles.timezoneItem}
          onPress={() => handleSelectTimezone(item)}
        >
          <Text
            style={[styles.timezoneName, { color: themeColors.text }]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
          <View
            style={[
              styles.radioOuter,
              {
                borderColor: isSelected
                  ? themeColors.primary
                  : themeColors.border,
              },
              isSelected && { backgroundColor: themeColors.primary },
            ]}
          >
            {isSelected && (
              <Check
                {...({
                  size: 12,
                  color: themeColors.primaryForeground,
                  strokeWidth: 3,
                } as any)}
              />
            )}
          </View>
        </PressableOpacity>
      );
    },
    [activeSelection, themeColors, handleSelectTimezone]
  );

  const renderSeparator = useCallback(
    () => <Separator style={styles.separator} />,
    []
  );

  const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
  const gradientHeight = headerHeight + 12;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={confirmable ? handleCloseWithConfirmation : onClose}
    >
      <View
        style={[
          styles.modalContainer,
          { backgroundColor: themeColors.backgroundSecondary },
        ]}
      >
        {/* Timezone List */}
        <View style={styles.listContainer}>
          <FlashList
            ref={listRef as any}
            data={filteredTimezones}
            renderItem={renderItem}
            ItemSeparatorComponent={renderSeparator}
            ListHeaderComponent={
              <View
                style={[
                  styles.listHeader,
                  { paddingTop: headerHeight + 16 },
                ]}
              >
                <SearchBar
                  value={searchQuery}
                  onChangeText={onSearchChange}
                  placeholder="Search"
                  clearable={false}
                />
              </View>
            }
            keyExtractor={(item) => item.value}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        </View>

        {/* Fixed Header with blur effect */}
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
              styles.modalHeader,
              {
                paddingTop:
                  Platform.OS === 'android' ? 12 + insets.top : 12,
              },
            ]}
          >
            <IconButton
              icon={{ sf: 'xmark', IconComponent: X }}
              onPress={confirmable ? handleCloseWithConfirmation : onClose}
              size="md"
              color={themeColors.text}
            />
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              {title}
            </Text>
            {confirmable ? (
              <IconButton
                icon={{ sf: 'checkmark', IconComponent: Check }}
                onPress={handleConfirm}
                size="md"
                variant={hasChanges ? 'primary' : 'default'}
                disabled={!hasChanges}
                loading={isSaving}
              />
            ) : (
              <View style={styles.headerPlaceholder} />
            )}
          </View>
        </View>
      </View>

      {confirmable && (
        <Dialog
          visible={showDiscardDialog}
          onClose={() => setShowDiscardDialog(false)}
          title={t('common.discardChanges')}
          message={t('common.discardChangesMessage')}
          showCloseIcon={false}
          buttons={[
            { label: t('common.cancel'), onPress: () => setShowDiscardDialog(false), variant: 'secondary' },
            { label: t('common.discard'), onPress: () => { setShowDiscardDialog(false); onClose(); }, variant: 'destructive' },
          ]}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalTitle: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 44,
    height: 44,
  },
  listHeader: {
    paddingBottom: 12,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  timezoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  timezoneName: {
    ...typography.p2,
    flex: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {},
});
