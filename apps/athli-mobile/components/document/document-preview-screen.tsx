import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Text, Keyboard, TouchableWithoutFeedback, Image as RNImage, Alert, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Download } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { iconSizes, typography } from '@/constants/typography';
import { PlatformIcon } from '@/components/platform-icon';
import { IconButton } from '@/components/icon-button';
import { AttachmentPreviewToolbar } from '@/components/camera/attachment-preview-toolbar';
import { sendDocumentMessage } from '@/services/chats-service';
import { useDarkModeTheme } from '@/components/dark-mode-wrapper';
import { StatusBar } from 'expo-status-bar';

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
    caption?: string; // Initial caption text from chat input
  }>();

  const { colors: themeColors } = useDarkModeTheme();
  const mutedSurfaceColor = themeColors.surfaceSecondary;
  const iconColor = themeColors.text;
  const insets = useSafeAreaInsets();

  const [caption, setCaption] = useState(params.caption || '');
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const documentUri = params.uri || '';
  const documentName = params.name || 'Document';
  const mimeType = params.mimeType || '';
  const clientName = params.clientName;
  const fromMessage = params.fromMessage === 'true';
  const showToolbar = !fromMessage;

  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf' || documentName.toLowerCase().endsWith('.pdf');
  const isOfficeDoc = mimeType.includes('wordprocessingml') || 
                      mimeType.includes('spreadsheetml') || 
                      mimeType.includes('presentationml') ||
                      mimeType.includes('msword') ||
                      mimeType.includes('ms-excel') ||
                      mimeType.includes('ms-powerpoint');

  // Load PDF: For iOS, write base64 to cache directory and use file:// URI
  // For Android, can use base64 data URI directly
  useEffect(() => {
    const loadPDF = async () => {
      if (isImage || documentUri.startsWith('http://') || documentUri.startsWith('https://')) {
        setPdfUri(documentUri);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const fileInfo = await FileSystem.getInfoAsync(documentUri);
        if (!fileInfo.exists) {
          setError('Document file not found');
          setIsLoading(false);
          return;
        }

        if (!isPdf) {
          setError('This document type cannot be previewed. Please download it to view.');
          setIsLoading(false);
          return;
        }

        // Read the PDF file as base64
        const base64 = await FileSystem.readAsStringAsync(documentUri, {
          encoding: 'base64' as any,
        });

        if (Platform.OS === 'ios') {
          // For iOS: Copy file to cache directory and use file:// URI
          // This is safer than writing base64
          const cacheDir = FileSystem.cacheDirectory;
          if (!cacheDir) {
            throw new Error('Cache directory not available');
          }

          const pdfPath = `${cacheDir}preview_${Date.now()}.pdf`;
          
          // Copy the file to cache directory
          await FileSystem.copyAsync({
            from: documentUri,
            to: pdfPath,
          });

          setPdfUri(pdfPath);
        } else {
          // For Android: Use data URI directly
          const dataUriString = `data:application/pdf;base64,${base64}`;
          setPdfUri(dataUriString);
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF. Please try downloading it instead.');
      } finally {
        setIsLoading(false);
      }
    };

    if (documentUri) {
      loadPDF();
    }

    // Cleanup: Remove cached PDF file when component unmounts
    return () => {
      if (pdfUri && Platform.OS === 'ios' && pdfUri.startsWith(FileSystem.cacheDirectory || '')) {
        FileSystem.deleteAsync(pdfUri, { idempotent: true }).catch(console.error);
      }
    };
  }, [documentUri, mimeType, isImage, isPdf]);

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

      if (!params.chatId) {
        console.error('No chatId provided');
        return;
      }

      // Send document message
      await sendDocumentMessage(
        params.chatId,
        bytes,
        documentName,
        mimeType,
        caption.trim() || undefined
      );

      // Pass document message data back to chat screen via navigation params
      // The chat screen will add it to the message list
      router.back();
      
      // Set params to add document message to list and close attachment picker
      setTimeout(() => {
        if (params.chatId) {
          router.setParams({
            documentSent: 'true',
            sentDocument: JSON.stringify({
              name: documentName,
              mimeType: mimeType,
              size: params.size,
              uri: documentUri,
              caption: caption.trim() || '',
            }),
          } as any);
        }
      }, 200);
    } catch (error) {
      console.error('Error reading document:', error);
    }
  };

  const renderDocumentContent = () => {
    const headerHeight = insets.top + 60; // Safe area + header content
    
    if (isImage) {
      return (
        <RNImage
          source={{ uri: documentUri }}
          style={[
            StyleSheet.absoluteFill,
            {
              top: headerHeight,
              bottom: 0,
            },
          ]}
          resizeMode="contain"
        />
      );
    }

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.text }]}>Loading document...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: themeColors.text }]}>{error}</Text>
          <Text style={[styles.errorSubtext, { color: themeColors.mutedText }]}>
            {!fromMessage && 'You can download the document to view it in another app'}
          </Text>
          {fromMessage && (
            <TouchableOpacity
              style={[styles.downloadButtonLarge, { backgroundColor: themeColors.primary }]}
              activeOpacity={0.7}
              onPress={handleDownload}
            >
              <PlatformIcon
                sf="arrow.down.circle.fill"
                IconComponent={Download}
                size={24}
                color={themeColors.primaryForeground}
              />
              <Text style={[styles.downloadButtonText, { color: themeColors.primaryForeground }]}>
                Download PDF
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (isPdf && pdfUri) {
      // For PDFs, use WebView with the prepared URI (file:// for iOS, data: for Android)
      // Add top margin to account for header and bottom margin for toolbar
      const headerHeight = insets.top + 60; // Safe area + header content
      const toolbarHeight = 112; // AttachmentPreviewToolbar closedBaseHeight
      const bottomMargin = !fromMessage ? toolbarHeight + insets.bottom : 0;
      const paddingBottom = fromMessage ? 56 : 0;
      return (
        <WebView
          source={{ uri: pdfUri }}
          style={[
            styles.webView,
            {
              marginTop: headerHeight,
              marginBottom: bottomMargin,
              paddingBottom: paddingBottom,
            },
          ]}
          scalesPageToFit={true}
          startInLoadingState={true}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
            setError('Failed to display PDF. Please download it to view.');
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView HTTP error:', nativeEvent);
            setError('Failed to load PDF. Please download it to view.');
          }}
          originWhitelist={['*']}
          allowFileAccess={Platform.OS === 'android'}
          allowFileAccessFromFileURLs={Platform.OS === 'android'}
          allowUniversalAccessFromFileURLs={Platform.OS === 'android'}
          mixedContentMode={Platform.OS === 'android' ? 'always' : undefined}
          javaScriptEnabled={false}
          domStorageEnabled={false}
        />
      );
    }

    // For Office documents and other types, WebView can't render them
    // Show a message that they need to be opened in another app
    if (isOfficeDoc || (!isPdf && !isImage)) {
      return (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: themeColors.text }]}>
            This document type cannot be previewed
          </Text>
          <Text style={[styles.errorSubtext, { color: themeColors.mutedText }]}>
            Download the document to view it in another app
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {showToolbar && <StatusBar hidden />}
        {renderDocumentContent()}

        <View
          style={[
            styles.safeArea,
            {
              paddingTop: insets.top,
              paddingBottom: 0,
              paddingLeft: 0,
              paddingRight: 0,
            },
          ]}
        >
          {/* Top header */}
          <View style={styles.topHeader}>
            <IconButton
              icon={{ sf: 'xmark', IconComponent: X }}
              onPress={handleClose}
              size="md"
              color={iconColor}
            />

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
                  sf="square.and.arrow.down"
                  IconComponent={Download}
                  size={iconSizes.navigationChevrons + 2}
                  color={iconColor}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.spacer} />
            )}
          </View>
        </View>

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
    paddingHorizontal: 16,
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
    ...typography.h6,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    ...typography.p2,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  errorText: {
    ...typography.h3,
    textAlign: 'center',
  },
  errorSubtext: {
    ...typography.p2,
    textAlign: 'center',
    marginBottom: 16,
  },
  downloadButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  downloadButtonText: {
    ...typography.p2,
    fontWeight: '600',
  },
});

export default DocumentPreviewScreen;
