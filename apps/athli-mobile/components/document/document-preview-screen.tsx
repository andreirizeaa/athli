import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Text, Keyboard, TouchableWithoutFeedback, Image as RNImage, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Download } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { iconSizes, typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { PlatformIcon } from '@/components/platform-icon';
import { AttachmentPreviewToolbar } from '@/components/camera/attachment-preview-toolbar';

const DocumentPreviewScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    uri?: string;
    name?: string;
    mimeType?: string;
    size?: string;
    chatId?: string;
    clientId?: string;
    clientName?: string;
    fromMessage?: string;
  }>();

  const { colors: themeColors } = useThemePreference();
  const mutedSurfaceColor = themeColors.surfaceSecondary;
  const iconColor = themeColors.text;

  const [caption, setCaption] = useState('');

  const documentUri = params.uri || '';
  const documentName = params.name || 'Document';
  const mimeType = params.mimeType || '';
  const clientName = params.clientName;
  const fromMessage = params.fromMessage === 'true';

  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf' || documentName.toLowerCase().endsWith('.pdf');

  const handleClose = () => {
    router.back();
  };

  const handleDownload = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      // Share/download the file
      await Sharing.shareAsync(documentUri, {
        mimeType: mimeType,
        dialogTitle: `Download ${documentName}`,
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      Alert.alert('Error', 'Failed to download document');
    }
  };

  const handleSend = async () => {
    try {
      // Read the document file as bytes
      const base64 = await FileSystem.readAsStringAsync(documentUri, {
        encoding: 'base64' as any,
      });

      // Convert base64 to Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const documentData = {
        uri: documentUri,
        name: documentName,
        mimeType: mimeType,
        size: params.size,
        bytes: bytes,
        caption: caption,
        chatId: params.chatId,
        clientId: params.clientId,
        clientName: clientName,
      };

      console.log('Document data to send:', documentData);
      // TODO: Implement actual send logic
    } catch (error) {
      console.error('Error reading document:', error);
    }
  };

  const renderDocumentContent = () => {
    if (isImage) {
      return (
        <RNImage
          source={{ uri: documentUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
        />
      );
    }

    if (isPdf) {
      // For PDFs, use WebView
      return (
        <WebView
          source={{ uri: documentUri }}
          style={styles.webView}
          scalesPageToFit={true}
          startInLoadingState={true}
        />
      );
    }

    // For other document types, try to display in WebView
    // Some formats may not render, but we'll attempt it
    return (
      <WebView
        source={{ uri: documentUri }}
        style={styles.webView}
        scalesPageToFit={true}
        startInLoadingState={true}
      />
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {renderDocumentContent()}

        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Top header */}
          <View style={styles.topHeader}>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: mutedSurfaceColor }]}
              activeOpacity={0.7}
              onPress={handleClose}
            >
              <PlatformIcon
                sf="xmark"
                IconComponent={X}
                size={iconSizes.navigationChevrons}
                color={iconColor}
              />
            </TouchableOpacity>

            {/* Document name in center */}
            <View style={styles.titleContainer}>
              <Text
                style={[styles.titleText, { color: themeColors.text }]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {documentName}
              </Text>
            </View>

            {/* Download button (only when opened from message) or spacer */}
            {fromMessage ? (
              <TouchableOpacity
                style={[styles.downloadButton, { backgroundColor: mutedSurfaceColor }]}
                activeOpacity={0.7}
                onPress={handleDownload}
              >
                <PlatformIcon
                  sf="arrow.down.circle"
                  IconComponent={Download}
                  size={iconSizes.navigationChevrons}
                  color={iconColor}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.spacer} />
            )}
          </View>
        </SafeAreaView>

        {/* Bottom section with toolbar - only show when not from message */}
        {!fromMessage && (
          <View style={styles.toolbarWrapper}>
            <AttachmentPreviewToolbar
              value={caption}
              onChangeText={setCaption}
              clientName={clientName}
              onSend={handleSend}
            />
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  titleText: {
    ...typography.h3,
    fontWeight: '600',
  },
  spacer: {
    width: 44,
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  toolbarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});

export default DocumentPreviewScreen;
