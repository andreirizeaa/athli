import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, Alert, ScrollView } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, Image, Video, FileText } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';
import { Card } from '@/components/card';
import { Separator } from '@/components/separator';
import { PlatformIcon } from '@/components/platform-icon';
import { addFile, type AddFileData } from '@/services/file-service';

type SelectedFile = {
  uri: string;
  type: 'photo' | 'video' | 'pdf';
  name?: string;
  size?: number;
};

export default function AddFileModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleSave = async () => {
    if (!fileName.trim()) {
      Alert.alert(t('files.addFile.errors.nameRequired'));
      return;
    }

    if (!selectedFile) {
      Alert.alert(t('files.addFile.errors.fileRequired'));
      return;
    }

    setIsSaving(true);
    try {
      const fileData: AddFileData = {
        name: fileName.trim(),
        uri: selectedFile.uri,
        type: selectedFile.type,
        size: selectedFile.size,
      };

      await addFile(fileData);

      if (router.canGoBack()) {
        router.back();
      }
    } catch (error) {
      Alert.alert(t('files.addFile.errors.saveFailed'));
      console.error('Error saving file:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoPress = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('files.addFile.errors.permissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri) {
          setSelectedFile({
            uri: asset.uri,
            type: 'photo',
            name: asset.fileName || undefined,
            size: asset.fileSize,
          });
        }
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert(t('files.addFile.errors.pickFailed'));
    }
  };

  const handleVideoPress = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('files.addFile.errors.permissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri) {
          setSelectedFile({
            uri: asset.uri,
            type: 'video',
            name: asset.fileName || undefined,
            size: asset.fileSize,
          });
        }
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert(t('files.addFile.errors.pickFailed'));
    }
  };

  const handleDocumentPress = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          type: 'pdf',
          name: asset.name || undefined,
          size: asset.size,
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert(t('files.addFile.errors.pickFailed'));
    }
  };

  const canSave = fileName.trim().length > 0 && selectedFile !== null && !isSaving;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === 'android' ? 20 + insets.top : 20,
            backgroundColor: themeColors.background,
          },
        ]}
      >
        <IconButton
          icon={{ sf: 'xmark', IconComponent: X }}
          onPress={handleClose}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.title, { color: themeColors.text }]}>
          {t('files.addFile.title')}
        </Text>
        <IconButton
          icon={{ sf: 'checkmark', IconComponent: Check }}
          onPress={handleSave}
          size="md"
          color={canSave ? themeColors.primary : themeColors.mutedText}
          disabled={!canSave}
          style={!canSave ? { opacity: 0.5 } : undefined}
        />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          {/* File name row */}
          <View style={styles.inputRow}>
            <Text style={[styles.label, { color: themeColors.text }]}>
              {t('files.addFile.fileName')}
            </Text>
            <TextInput
              style={[styles.input, { color: themeColors.text }]}
              placeholder={t('files.addFile.fileNamePlaceholder')}
              placeholderTextColor={themeColors.mutedText}
              value={fileName}
              onChangeText={setFileName}
              textAlignVertical="center"
            />
          </View>
          <Separator />
          {/* Attach file row */}
          <View style={styles.attachRow}>
            <Text style={[styles.label, { color: themeColors.text }]}>
              {t('files.addFile.attachFile')}
            </Text>
            <View style={styles.attachmentButtons}>
              <PressableOpacity
                style={[
                  styles.attachmentButton,
                  selectedFile?.type === 'photo' && [
                    styles.attachmentButtonSelected,
                    { borderColor: themeColors.primary },
                  ],
                ]}
                onPress={handlePhotoPress}
              >
                <View style={[styles.iconCircle, { backgroundColor: themeColors.primary + '20' }]}>
                  <PlatformIcon
                    sf="photo.on.rectangle"
                    IconComponent={Image}
                    size={iconSizes.tabBarIcons}
                    color={themeColors.primary}
                  />
                </View>
                <Text style={[styles.attachmentLabel, { color: themeColors.text }]}>
                  {t('files.addFile.photos')}
                </Text>
              </PressableOpacity>

              <PressableOpacity
                style={[
                  styles.attachmentButton,
                  selectedFile?.type === 'video' && [
                    styles.attachmentButtonSelected,
                    { borderColor: themeColors.primary },
                  ],
                ]}
                onPress={handleVideoPress}
              >
                <View style={[styles.iconCircle, { backgroundColor: themeColors.primary + '20' }]}>
                  <PlatformIcon
                    sf="video"
                    IconComponent={Video}
                    size={iconSizes.tabBarIcons}
                    color={themeColors.primary}
                  />
                </View>
                <Text style={[styles.attachmentLabel, { color: themeColors.text }]}>
                  {t('files.addFile.videos')}
                </Text>
              </PressableOpacity>

              <PressableOpacity
                style={[
                  styles.attachmentButton,
                  selectedFile?.type === 'pdf' && [
                    styles.attachmentButtonSelected,
                    { borderColor: themeColors.primary },
                  ],
                ]}
                onPress={handleDocumentPress}
              >
                <View style={[styles.iconCircle, { backgroundColor: themeColors.primary + '20' }]}>
                  <PlatformIcon
                    sf="doc.text"
                    IconComponent={FileText}
                    size={iconSizes.tabBarIcons}
                    color={themeColors.primary}
                  />
                </View>
                <Text style={[styles.attachmentLabel, { color: themeColors.text }]}>
                  {t('files.addFile.pdfs')}
                </Text>
              </PressableOpacity>
            </View>
          </View>
          {/* Selected file display */}
          {selectedFile && (
            <>
              <Separator />
              <View style={styles.selectedFileRow}>
                <Text style={[styles.selectedFileLabel, { color: themeColors.text }]}>
                  {t('files.addFile.selected')}: {selectedFile.name || selectedFile.type}
                </Text>
              </View>
            </>
          )}
        </Card>
      </ScrollView>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    marginTop: 8,
  },
  inputRow: {
    paddingVertical: 12,
    minHeight: 44,
  },
  label: {
    ...typography.p2,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    ...typography.p2,
    padding: 0,
  },
  attachRow: {
    paddingVertical: 12,
  },
  attachmentButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    gap: 16,
  },
  attachmentButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 12,
  },
  attachmentButtonSelected: {
    borderWidth: 2,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentLabel: {
    ...typography.p3,
    fontSize: 12,
  },
  selectedFileRow: {
    paddingVertical: 12,
  },
  selectedFileLabel: {
    ...typography.p2,
    fontStyle: 'italic',
  },
});
