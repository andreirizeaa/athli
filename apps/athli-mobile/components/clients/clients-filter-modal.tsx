import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { CheckSquare, Square } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { BottomSheetModal } from '@/components/bottom-sheet-modal';
import { PlatformIcon } from '@/components/platform-icon';
import { DualButtonPanel } from '@/components/buttons';

type ClientsFilterModalProps = {
  visible: boolean;
  onClose: () => void;
  selectedCategories: Set<string>;
  onApplyFilters: (categories: Set<string>) => void;
};

export const ClientsFilterModal = ({
  visible,
  onClose,
  selectedCategories,
  onApplyFilters,
}: ClientsFilterModalProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { height: windowHeight } = useWindowDimensions();
  const [tempSelectedCategories, setTempSelectedCategories] = useState<Set<string>>(new Set());
  const [hasFilterChanges, setHasFilterChanges] = useState(false);

  const filtersContentMinHeight = (windowHeight * 0.4) - 100;
  const hasAppliedFilters = selectedCategories.size > 0;
  const shouldShowButtons = hasFilterChanges || hasAppliedFilters;

  // Initialize temp categories when modal opens
  React.useEffect(() => {
    if (visible) {
      setTempSelectedCategories(new Set(selectedCategories));
      setHasFilterChanges(false);
    }
  }, [visible, selectedCategories]);

  const handleToggleCategory = (category: string) => {
    const newTemp = new Set(tempSelectedCategories);
    if (newTemp.has(category)) {
      newTemp.delete(category);
    } else {
      newTemp.add(category);
    }
    setTempSelectedCategories(newTemp);

    // Check if filters have changed
    const hasChanged =
      newTemp.size !== selectedCategories.size ||
      Array.from(newTemp).some((cat) => !selectedCategories.has(cat)) ||
      Array.from(selectedCategories).some((cat) => !newTemp.has(cat));
    setHasFilterChanges(hasChanged);
  };

  const handleResetFilters = () => {
    setTempSelectedCategories(new Set());
    // If there were applied filters, this is a change
    setHasFilterChanges(selectedCategories.size > 0);
  };

  const handleApplyFilters = () => {
    onApplyFilters(new Set(tempSelectedCategories));
    setHasFilterChanges(false);
    onClose();
  };

  const handleClose = () => {
    setTempSelectedCategories(new Set(selectedCategories));
    setHasFilterChanges(false);
    onClose();
  };

  return (
    <BottomSheetModal visible={visible} onClose={handleClose} title={t('clients.filterModal.title')} height="40%">
      <View style={[styles.filtersContent, { minHeight: filtersContentMinHeight }]}>
        <View style={styles.filtersList}>
          <Text style={[styles.filterLabel, { color: themeColors.text }]}>{t('clients.filterModal.category')}</Text>
          {[
            { value: 'online', label: t('clients.filterModal.online') },
            { value: 'in-person', label: t('clients.filterModal.inPerson') },
            { value: 'hybrid', label: t('clients.filterModal.hybrid') },
          ].map((category) => {
            const isSelected = tempSelectedCategories.has(category.value);
            return (
              <TouchableOpacity
                key={category.value}
                style={styles.filterOption}
                activeOpacity={0.7}
                onPress={() => handleToggleCategory(category.value)}
              >
                <PlatformIcon
                  sf={isSelected ? 'checkmark.square.fill' : 'square'}
                  IconComponent={isSelected ? CheckSquare : Square}
                  size={24}
                  color={isSelected ? themeColors.primary : themeColors.mutedText}
                />
                <Text style={[styles.filterOptionText, { color: themeColors.text }]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {shouldShowButtons && (
          <DualButtonPanel
            primaryLabel={t('clients.filterModal.apply')}
            secondaryLabel={t('clients.filterModal.reset')}
            onPrimaryPress={handleApplyFilters}
            onSecondaryPress={handleResetFilters}
            style={styles.buttonsContainer}
          />
        )}
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  filtersContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  filtersList: {
    flex: 1,
  },
  filterLabel: {
    ...typography.p2,
    marginBottom: 4,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  filterOptionText: {
    ...typography.p3,
    marginLeft: 6,
  },
  buttonsContainer: {
    marginTop: 16,
  },
});

