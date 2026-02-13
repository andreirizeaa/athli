import React, { useState } from 'react';
import { View, type ViewStyle, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';

type AvatarProps = {
  uri: string | null | undefined;
  size: number;
  style?: ViewStyle;
  borderRadius?: number;
  fallback?: React.ReactNode;
};

/**
 * Avatar component that properly handles both SVG and raster images.
 * SVGs are rendered in a WebView for correct browser-native rendering.
 * Regular images use expo-image with cover fit.
 * Shows fallback as placeholder while loading to prevent flicker.
 */
export const Avatar = ({
  uri,
  size,
  style,
  borderRadius,
  fallback,
}: AvatarProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const isSvg = uri?.includes('.svg') || uri?.includes('data:image/svg') || uri?.includes('image/svg');

  if (!uri) {
    return fallback ? <>{fallback}</> : null;
  }

  if (isSvg) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; overflow: hidden; }
            img { width: 100%; height: 100%; object-fit: cover; }
          </style>
        </head>
        <body>
          <img src="${uri}" onload="window.ReactNativeWebView.postMessage('loaded')" />
        </body>
      </html>
    `;

    return (
      <View style={{
        width: size,
        height: size,
        borderRadius,
        overflow: 'hidden',
        ...style
      }}>
        {/* Show fallback as placeholder until WebView loads */}
        {!isLoaded && fallback && (
          <View style={StyleSheet.absoluteFill}>
            {fallback}
          </View>
        )}
        <WebView
          source={{ html }}
          style={{ width: size, height: size, backgroundColor: 'transparent' }}
          scrollEnabled={false}
          scalesPageToFit={true}
          onMessage={() => setIsLoaded(true)}
        />
      </View>
    );
  }

  return (
    <View style={{
      width: size,
      height: size,
      borderRadius,
      overflow: 'hidden',
      ...style
    }}>
      {/* Show fallback as placeholder until image loads */}
      {!isLoaded && fallback && (
        <View style={StyleSheet.absoluteFill}>
          {fallback}
        </View>
      )}
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius }}
        contentFit="cover"
        contentPosition="center"
        cachePolicy="memory-disk"
        onLoad={() => setIsLoaded(true)}
      />
    </View>
  );
};
