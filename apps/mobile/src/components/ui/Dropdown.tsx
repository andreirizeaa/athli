import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';

interface DropdownOption<T> {
  label: string;
  value: T;
}

interface DropdownProps<T> {
  options: DropdownOption<T>[];
  selectedValue: T;
  onValueChange: (value: T) => void;
  placeholder?: string;
  colors: {
    background: string;
    border: string;
    text: string;
    surface: string;
    surfaceSecondary: string;
  };
}

export function Dropdown<T extends string | number>({
  options,
  selectedValue,
  onValueChange,
  placeholder = 'Select an option',
  colors,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  const handleSelect = (value: T) => {
    onValueChange(value);
    setIsOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.dropdown,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dropdownText,
            {
              color: selectedOption ? colors.text : colors.text + '80',
            },
          ]}
        >
          {selectedOption?.label || placeholder}
        </Text>
        <ChevronDown size={20} color={colors.text} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsOpen(false)}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.surface,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <TouchableOpacity
                    style={[
                      styles.option,
                      {
                        backgroundColor: isSelected
                          ? colors.surfaceSecondary
                          : 'transparent',
                      },
                    ]}
                    onPress={() => handleSelect(item.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: colors.text,
                          fontWeight: isSelected ? '600' : '400',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <View
                        style={[
                          styles.checkmark,
                          { backgroundColor: colors.text },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
  checkmark: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

