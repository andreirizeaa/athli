import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { Card } from '@/components/card';
import { IconButton } from '@/components/icon-button';
import { Separator } from '@/components/separator';
import { editPersonalDetails } from '@/services/personal-details-service';

type FieldType = 'name' | 'age' | 'gender' | 'height' | 'weight';

export default function EditPersonalDetailsModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ field: FieldType }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const field = params.field || 'name';

  // Mock user data - in the future, this will come from user service/context
  const [clientName, setClientName] = useState('John Doe');
  const [clientAge, setClientAge] = useState(25);
  const [clientGender, setClientGender] = useState<'Male' | 'Female' | 'Prefer not to say'>('Male');
  const [clientHeight, setClientHeight] = useState(175); // in cm
  const [clientWeight, setClientWeight] = useState(70); // in kg

  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = React.useRef<TextInput>(null);

  // Auto-focus name input when field is 'name'
  useEffect(() => {
    if (field === 'name' && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [field]);

  const handleClose = () => {
    router.back();
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      let value: string | number;
      switch (field) {
        case 'name':
          value = clientName;
          break;
        case 'age':
          value = clientAge;
          break;
        case 'gender':
          value = clientGender;
          break;
        case 'height':
          value = clientHeight;
          break;
        case 'weight':
          value = clientWeight;
          break;
        default:
          value = '';
      }

      await editPersonalDetails(field, value);
      router.back();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Age options: 18-120
  const ageOptions = useMemo(() => {
    return Array.from({ length: 103 }, (_, i) => 18 + i);
  }, []);

  // Height options: 100-250 cm (metric only for now)
  const heightOptions = useMemo(() => {
    return Array.from({ length: 151 }, (_, i) => 100 + i);
  }, []);

  // Weight options: 40-250 kg in 0.1kg increments - memoized once to avoid recalculation
  const weightOptions = useMemo(() => {
    const options: number[] = [];
    for (let i = 0; i < 2101; i++) {
      options.push(Number((40 + i * 0.1).toFixed(1)));
    }
    return options;
  }, []);

  const repeats = 20;
  const middleRepeatIndex = Math.floor(repeats / 2);

  const renderContent = () => {
    switch (field) {
      case 'name':
        return (
          <Card>
            <TextInput
              ref={nameInputRef}
              style={[styles.input, { color: themeColors.text }]}
              value={clientName}
              onChangeText={setClientName}
              placeholder={t('personalDetails.namePlaceholder')}
              placeholderTextColor={themeColors.mutedText}
              textAlignVertical="center"
              autoFocus
            />
          </Card>
        );

      case 'age':
        return (
          <View style={styles.pickerFullWidthContainer}>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={(() => {
                  const len = ageOptions.length;
                  const idx = Math.max(0, Math.min(len - 1, clientAge - 18));
                  return middleRepeatIndex * len + idx;
                })()}
                onValueChange={(value) => {
                  const len = ageOptions.length;
                  const idx = Number(value) % len;
                  setClientAge(ageOptions[idx]);
                }}
                style={styles.picker}
                itemStyle={Platform.OS === 'ios' ? { fontSize: 16 } : undefined}
              >
                {Array.from(
                  { length: repeats * ageOptions.length },
                  (_, i) => ageOptions[i % ageOptions.length]
                ).map((age, index) => (
                  <Picker.Item key={`age-${index}`} label={String(age)} value={index} />
                ))}
              </Picker>
            </View>
          </View>
        );

      case 'gender':
        return (
          <Card>
            {(['Male', 'Female', 'Prefer not to say'] as const).map((gender, index) => (
              <React.Fragment key={gender}>
                {index > 0 && <Separator />}
                <TouchableOpacity
                  style={styles.genderRow}
                  onPress={() => setClientGender(gender)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.genderText, { color: themeColors.text }]}>
                    {gender === 'Male'
                      ? t('personalDetails.gender.male')
                      : gender === 'Female'
                      ? t('personalDetails.gender.female')
                      : t('personalDetails.gender.preferNotToSay')}
                  </Text>
                  {clientGender === gender && (
                    <Check size={iconSizes.navigationChevrons} color={themeColors.primary} />
                  )}
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </Card>
        );

      case 'height':
        return (
          <View style={styles.pickerFullWidthContainer}>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={(() => {
                  const len = heightOptions.length;
                  const idx = Math.max(0, Math.min(len - 1, clientHeight - 100));
                  return middleRepeatIndex * len + idx;
                })()}
                onValueChange={(value) => {
                  const len = heightOptions.length;
                  const idx = Number(value) % len;
                  setClientHeight(heightOptions[idx]);
                }}
                style={styles.picker}
                itemStyle={Platform.OS === 'ios' ? { fontSize: 16 } : undefined}
              >
                {Array.from(
                  { length: repeats * heightOptions.length },
                  (_, i) => heightOptions[i % heightOptions.length]
                ).map((height, index) => (
                  <Picker.Item
                    key={`h-${index}`}
                    label={`${height} ${t('personalDetails.cm')}`}
                    value={index}
                  />
                ))}
              </Picker>
            </View>
          </View>
        );

      case 'weight':
        return (
          <View style={styles.pickerFullWidthContainer}>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={(() => {
                  const base = 40;
                  const len = weightOptions.length;
                  const idx = Math.max(0, Math.min(len - 1, Math.round((clientWeight - base) * 10)));
                  return middleRepeatIndex * len + idx;
                })()}
                onValueChange={(value) => {
                  const len = weightOptions.length;
                  const idx = Number(value) % len;
                  setClientWeight(weightOptions[idx]);
                }}
                style={styles.picker}
                itemStyle={Platform.OS === 'ios' ? { fontSize: 16 } : undefined}
              >
                {Array.from(
                  { length: repeats * weightOptions.length },
                  (_, i) => weightOptions[i % weightOptions.length]
                ).map((weight, index) => (
                  <Picker.Item
                    key={`w-${index}`}
                    label={`${weight.toFixed(1)} ${t('personalDetails.kg')}`}
                    value={index}
                  />
                ))}
              </Picker>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (field) {
      case 'name':
        return t('personalDetails.editName');
      case 'age':
        return t('personalDetails.editAge');
      case 'gender':
        return t('personalDetails.editGender');
      case 'height':
        return t('personalDetails.editHeight');
      case 'weight':
        return t('personalDetails.editWeight');
      default:
        return t('personalDetails.editDetails');
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.pageBackground,
          paddingTop: Platform.OS === 'android' ? 20 + insets.top : 20,
        },
      ]}
    >
      <View style={[styles.header, { backgroundColor: themeColors.pageBackground }]}>
        <IconButton
          icon={{ sf: 'xmark', IconComponent: X }}
          onPress={handleClose}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.title, { color: themeColors.text }]}>{getTitle()}</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={styles.saveButton}
          activeOpacity={0.7}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={themeColors.primary} />
          ) : (
            <IconButton
              icon={{ sf: 'checkmark', IconComponent: Check }}
              onPress={handleSave}
              size="md"
              color={themeColors.primary}
            />
          )}
        </TouchableOpacity>
      </View>

      {field === 'age' || field === 'height' || field === 'weight' ? (
        <View style={styles.scrollView}>
          {renderContent()}
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    marginTop: 4,
  },
  title: {
    ...typography.h5,
  },
  saveButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  scrollContentFullWidth: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    ...typography.p1,
    flex: 1,
    paddingVertical: 12,
    minHeight: 44,
  },
  inputLabel: {
    ...typography.p1,
    marginLeft: 16,
  },
  pickerFullWidthContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 16,
  },
  pickerContainer: {
    width: '100%',
    height: Platform.OS === 'ios' ? 280 : 200,
  },
  picker: {
    height: Platform.OS === 'ios' ? 280 : 200,
    width: '100%',
  },
  pickerLabel: {
    ...typography.p1,
    minWidth: 60,
  },
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  genderText: {
    ...typography.p1,
  },
});
