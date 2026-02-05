import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image as RNImage,
  Dimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { FileText, Play } from 'lucide-react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { type ThemeColors } from '@/constants/theme';
import { typography } from '@/constants/typography';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { tintHex, shadeHex, isLightColor } from '@/utils/colorUtils';

const screenWidth = Dimensions.get('window').width;
const BUBBLE_PADDING = 24;
const GRID_SIZE = Math.floor(screenWidth * 0.75 - BUBBLE_PADDING);
const GAP_SIZE = 4;

interface AttachmentItem {
  id: string;
  uri: string;
  mime_type?: string;
  filename?: string;
}

interface MessageAttachmentGridProps {
  attachments: AttachmentItem[];
  pendingCount?: number;
  themeColors: ThemeColors;
  parentBackgroundColor: string;
  isParentSent: boolean;
  onImagePress?: (images: AttachmentItem[], index: number) => void;
  onVideoPress?: (video: AttachmentItem) => void;
  onDocumentPress?: (document: AttachmentItem) => void;
}

// Helper to determine attachment type
const getAttachmentType = (attachment: AttachmentItem): 'image' | 'video' | 'audio' | 'document' => {
  const mime = attachment.mime_type || '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'document';
};

// Loading skeleton cell
const SkeletonCell = ({
  size,
  isParentSent,
  themeColors,
}: {
  size: number;
  isParentSent: boolean;
  themeColors: ThemeColors;
}) => {
  const skeletonColor = isParentSent
    ? 'rgba(255, 255, 255, 0.2)'
    : themeColors.surfaceSecondary;
  const textColor = isParentSent ? 'rgba(255,255,255,0.5)' : themeColors.mutedText;

  return (
    <View style={[styles.gridCell, { width: size, height: size, backgroundColor: skeletonColor }]}>
      <Text style={[styles.loadingText, { color: textColor }]}>Loading...</Text>
    </View>
  );
};

// Image cell
// Uses Tap gesture to only respond to taps - long press propagates to parent ContextMenuWrapper
const ImageCell = ({
  attachment,
  size,
  onPress,
}: {
  attachment: AttachmentItem;
  size: number;
  onPress?: () => void;
}) => {
  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      if (onPress) {
        runOnJS(onPress)();
      }
    });

  return (
    <GestureDetector gesture={tapGesture}>
      <View style={[styles.gridCell, { width: size, height: size }]}>
        <RNImage source={{ uri: attachment.uri }} style={styles.cellImage} resizeMode="cover" />
      </View>
    </GestureDetector>
  );
};

// Video cell with play icon - generates thumbnail for local videos
// Uses same size parameter as ImageCell and DocumentCell for consistent grid layout
const VideoCell = ({
  attachment,
  size,
  themeColors,
  onPress,
}: {
  attachment: AttachmentItem;
  size: number;
  themeColors: ThemeColors;
  onPress?: () => void;
}) => {
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);

  useEffect(() => {
    const generateThumbnail = async () => {
      if (!attachment.uri) return;

      // Check if it's a local file (optimistic message)
      const isLocalFile = attachment.uri.startsWith('file://') || attachment.uri.startsWith('/');

      if (isLocalFile) {
        // Generate thumbnail for local video files
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(attachment.uri, {
            time: 500,
            quality: 0.8,
          });
          setThumbnailUri(uri);
        } catch (error) {
          console.warn('Failed to generate video thumbnail:', error);
          // Keep thumbnailUri as null - will show black background with play icon
        }
      } else {
        // For remote signed URLs, we cannot use them as thumbnails directly
        // (they're video files, not images). Show black background with play icon.
        // In future, the server could provide a separate thumbnail_path.
        setThumbnailUri(null);
      }
    };

    generateThumbnail();
  }, [attachment.uri]);

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      if (onPress) {
        runOnJS(onPress)();
      }
    });

  return (
    <GestureDetector gesture={tapGesture}>
      <View style={[styles.gridCell, { width: size, height: size, backgroundColor: '#000' }]}>
        {thumbnailUri && (
          <RNImage source={{ uri: thumbnailUri }} style={styles.cellImage} resizeMode="cover" />
        )}
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <PlatformIcon sf="play.fill" IconComponent={Play} size={24} color="#fff" />
          </View>
        </View>
      </View>
    </GestureDetector>
  );
};

// PDF/Document cell (square format for grid)
const DocumentCell = ({
  attachment,
  size,
  parentBackgroundColor,
  isParentSent,
  themeColors,
  onPress,
}: {
  attachment: AttachmentItem;
  size: number;
  parentBackgroundColor: string;
  isParentSent: boolean;
  themeColors: ThemeColors;
  onPress?: () => void;
}) => {
  const adjustedBackground = isLightColor(parentBackgroundColor)
    ? shadeHex(parentBackgroundColor, 0.1)
    : tintHex(parentBackgroundColor, 0.15);

  const textColor = isParentSent ? themeColors.primaryForeground : themeColors.text;

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      if (onPress) {
        runOnJS(onPress)();
      }
    });

  return (
    <GestureDetector gesture={tapGesture}>
      <View
        style={[
          styles.gridCell,
          styles.documentCell,
          { width: size, height: size, backgroundColor: adjustedBackground },
        ]}
      >
        <View style={styles.documentIconContainer}>
          <PlatformIcon sf="doc.fill" IconComponent={FileText} size={24} color="#ea580c" />
        </View>
        <Text style={[styles.documentName, { color: textColor }]} numberOfLines={2}>
          {attachment.filename || 'Document'}
        </Text>
      </View>
    </GestureDetector>
  );
};

export const MessageAttachmentGrid = ({
  attachments,
  pendingCount = 0,
  themeColors,
  parentBackgroundColor,
  isParentSent,
  onImagePress,
  onVideoPress,
  onDocumentPress,
}: MessageAttachmentGridProps) => {
  // Filter out audio attachments (they render separately, full-width)
  const gridAttachments = attachments.filter(a => getAttachmentType(a) !== 'audio');

  // Total cells = loaded attachments + pending skeletons
  const totalCells = gridAttachments.length + pendingCount;

  if (totalCells === 0) return null;

  // Calculate cell size based on grid layout
  const getCellSize = (count: number, index: number): number => {
    if (count === 1) return GRID_SIZE;
    if (count === 2) return (GRID_SIZE - GAP_SIZE) / 2;
    if (count === 3) {
      // First row: 1 item full width, second row: 2 items
      return index === 0 ? GRID_SIZE : (GRID_SIZE - GAP_SIZE) / 2;
    }
    // 4+: 2x2 grid
    return (GRID_SIZE - GAP_SIZE) / 2;
  };

  // Get images for onImagePress callback - only those with URIs ready
  const imageAttachments = gridAttachments.filter(a => getAttachmentType(a) === 'image' && a.uri);

  const renderCell = (index: number) => {
    const cellSize = getCellSize(totalCells, index);
    // Use index-based key for all cells to prevent React unmount/remount when
    // attachments array transitions from empty to populated (keys stay consistent)
    const cellKey = `cell-${index}`;

    // If index >= loaded attachments, show skeleton (for pendingCount edge case)
    if (index >= gridAttachments.length) {
      return (
        <SkeletonCell
          key={cellKey}
          size={cellSize}
          isParentSent={isParentSent}
          themeColors={themeColors}
        />
      );
    }

    const attachment = gridAttachments[index];

    // Show skeleton if attachment exists but URI not ready yet
    // This maintains stable cell positions while URLs load asynchronously
    if (!attachment.uri) {
      return (
        <SkeletonCell
          key={cellKey}
          size={cellSize}
          isParentSent={isParentSent}
          themeColors={themeColors}
        />
      );
    }

    const type = getAttachmentType(attachment);

    switch (type) {
      case 'image':
        const imageIndex = imageAttachments.findIndex(a => a.id === attachment.id);
        return (
          <ImageCell
            key={cellKey}
            attachment={attachment}
            size={cellSize}
            onPress={() => onImagePress?.(imageAttachments, imageIndex)}
          />
        );
      case 'video':
        return (
          <VideoCell
            key={cellKey}
            attachment={attachment}
            size={cellSize}
            themeColors={themeColors}
            onPress={() => onVideoPress?.(attachment)}
          />
        );
      default:
        return (
          <DocumentCell
            key={cellKey}
            attachment={attachment}
            size={cellSize}
            parentBackgroundColor={parentBackgroundColor}
            isParentSent={isParentSent}
            themeColors={themeColors}
            onPress={() => onDocumentPress?.(attachment)}
          />
        );
    }
  };

  // Render based on total count
  if (totalCells === 1) {
    return (
      <View style={styles.wrapper}>
        {renderCell(0)}
      </View>
    );
  }

  if (totalCells === 2) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.row}>
          {renderCell(0)}
          <View style={{ width: GAP_SIZE }} />
          {renderCell(1)}
        </View>
      </View>
    );
  }

  if (totalCells === 3) {
    return (
      <View style={styles.wrapper}>
        {renderCell(0)}
        <View style={{ height: GAP_SIZE }} />
        <View style={styles.row}>
          {renderCell(1)}
          <View style={{ width: GAP_SIZE }} />
          {renderCell(2)}
        </View>
      </View>
    );
  }

  // 4+ attachments: 2x2 grid (show first 4)
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {renderCell(0)}
        <View style={{ width: GAP_SIZE }} />
        {renderCell(1)}
      </View>
      <View style={{ height: GAP_SIZE }} />
      <View style={styles.row}>
        {renderCell(2)}
        <View style={{ width: GAP_SIZE }} />
        {renderCell(3)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
    alignSelf: 'flex-start',
    maxWidth: GRID_SIZE,
  },
  row: {
    flexDirection: 'row',
  },
  gridCell: {
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellImage: {
    width: '100%',
    height: '100%',
  },
  pressed: {
    opacity: 0.9,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  documentCell: {
    flexDirection: 'column',
    padding: 8,
  },
  documentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentName: {
    ...typography.p4,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingText: {
    ...typography.p4,
    opacity: 0.7,
  },
});
