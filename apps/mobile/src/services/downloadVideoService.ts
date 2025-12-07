import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { showAlert } from './alertService';
import { hapticFeedback } from '../utils/haptic';
import { track } from './analytics';
import i18n from '../utils/i18n';
import { supabase } from '../lib/supabase';
import { extractObjectKeyFromUrl, signPath } from '../context/LiftDataContext';

interface DownloadVideoOptions {
  videoUrl: string | number | null;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  onPermissionRequired?: () => void;
}

export async function downloadVideoToLibrary({
  videoUrl,
  onSuccess,
  onError,
  onPermissionRequired,
}: DownloadVideoOptions): Promise<boolean> {
  try {
    // Track download attempt
    track('Video download attempted', {
      hasVideoUrl: !!videoUrl,
      videoUrlType: typeof videoUrl,
    });

    // 1) Request media library permissions
    const perm = await MediaLibrary.requestPermissionsAsync();

    if (!perm.granted) {
      if (onPermissionRequired) {
        onPermissionRequired();
        return false;
      } else {
        showAlert(
          i18n.t('feedback.permissionRequired'),
          i18n.t('feedback.photoLibraryPermissionMessage'),
          undefined,
          'Download permission denied'
        );
        return false;
      }
    }

    // Validate video URL
    if (!videoUrl || typeof videoUrl === 'number') {
      showAlert(
        i18n.t('feedback.downloadFailed'),
        i18n.t('feedback.videoNotAvailable'),
        undefined,
        'Video not available for download'
      );
      return false;
    }

    // 2) Use existing Supabase client

    // 3) Get signed URL for download
    let downloadUrl = videoUrl as string;

    if (typeof videoUrl === 'string') {
      try {
        // Try to get a fresh signed URL
        const key = await extractObjectKeyFromUrl(videoUrl);
        if (key) {
          const signedUrl = await signPath(key);
          if (signedUrl) {
            downloadUrl = signedUrl;
          }
        }
      } catch (error) {
        // Failed to get signed URL, using original
      }
    }

    // 4) Download the video file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `formai-lift-${timestamp}.mp4`;
    // Use documentDirectory for better iOS compatibility
    const fileUri = FileSystem.documentDirectory + filename;

    const download = await FileSystem.downloadAsync(downloadUrl, fileUri);

    if (download.status !== 200) {
      throw new Error(`Download failed: HTTP ${download.status}`);
    }

    // 5) Ensure the file has .mp4 extension for iOS compatibility
    let finalUri = download.uri;
    if (!download.uri.endsWith('.mp4')) {
      const mp4Uri = download.uri.replace(/(\.[^/]+)?$/, '.mp4');
      await FileSystem.moveAsync({ from: download.uri, to: mp4Uri });
      finalUri = mp4Uri;
    }

    // 6) Verify the downloaded file
    const info = await FileSystem.getInfoAsync(finalUri, { size: true });
    if (!info.exists || !('size' in info) || !info.size || info.size < 1024) {
      throw new Error(
        `Downloaded file is invalid or too small (${'size' in info ? info.size : 0} bytes)`
      );
    }

    // Additional validation: Check file format and provide detailed info
    try {
      const fileContent = await FileSystem.readAsStringAsync(finalUri, {
        encoding: FileSystem.EncodingType.Base64,
        length: 200, // Read first 200 characters for better detection
      });

      // Decode base64 to check actual file headers
      const buffer = Buffer.from(fileContent.slice(0, 100), 'base64');
      const header = buffer.toString('binary', 0, 20);

      // Check for common video file signatures
      const isMP4 = header.includes('ftyp') || header.includes('moov');
      const isAVI = header.includes('RIFF');
      const isMOV = header.includes('moov');

      if (isAVI) {
        throw new Error(
          'Video is in AVI format which is not supported by iOS Photos app. Please convert to MP4 format on the server side.'
        );
      }
    } catch (validationError) {
      // Could not validate file content
    }

    // 7) Save to photo library using createAssetAsync (more reliable for iOS)
    try {
      // Try createAssetAsync first (more reliable for iOS)
      const asset = await MediaLibrary.createAssetAsync(finalUri);
    } catch (createError) {
      try {
        // Fallback to saveToLibraryAsync
        await MediaLibrary.saveToLibraryAsync(finalUri);
      } catch (saveError) {
        // Check if this is likely an AVI format issue
        const isAVIError =
          (createError instanceof Error && createError.message.includes('3302')) ||
          (saveError instanceof Error && saveError.message.includes('3302'));

        if (isAVIError) {
          throw new Error(
            'This video format is not supported by iOS Photos app. The video appears to be in AVI format, which needs to be converted to MP4 format on the server side.'
          );
        } else {
          throw new Error(
            `Failed to save video to photo library. createAssetAsync: ${createError instanceof Error ? createError.message : String(createError)}, saveToLibraryAsync: ${saveError instanceof Error ? saveError.message : String(saveError)}`
          );
        }
      }
    }

    // 8) Place into "FormAI" album
    try {
      const assets = await MediaLibrary.getAssetsAsync({
        mediaType: 'video',
        sortBy: [MediaLibrary.SortBy.creationTime],
        first: 1,
      });

      if (assets.assets.length > 0) {
        const album = await MediaLibrary.getAlbumAsync('FormAI');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([assets.assets[0]], album, false);
        } else {
          await MediaLibrary.createAlbumAsync('FormAI', assets.assets[0], false);
        }
      }
    } catch (albumError) {
      // Album creation is optional, don't fail the whole operation
    }

    // Success feedback
    hapticFeedback.success();
    onSuccess?.();

    track('Video download success', {
      fileSize: 'size' in info ? info.size : 0,
      finalUri: finalUri,
    });

    return true;
  } catch (error) {
    // Track error for analytics
    track('Video download failed', {
      error: error instanceof Error ? error.message : String(error),
      videoUrl: typeof videoUrl === 'string' ? videoUrl : 'unknown',
    });

    // Show user-friendly error
    showAlert(
      i18n.t('feedback.downloadFailed'),
      i18n.t('feedback.downloadErrorMessage'),
      undefined,
      'Video download failed',
      error
    );

    onError?.(error);
    return false;
  }
}

// Helper function to validate video URL before attempting download
export function isValidVideoUrl(videoUrl: string | number | null): boolean {
  if (!videoUrl || typeof videoUrl === 'number') {
    return false;
  }

  if (typeof videoUrl !== 'string') {
    return false;
  }

  // Basic URL validation
  try {
    new URL(videoUrl);
    return true;
  } catch {
    return false;
  }
}

// Helper function to get file size for debugging
export async function getVideoFileInfo(videoUrl: string): Promise<{
  size: number;
  exists: boolean;
  uri: string;
} | null> {
  try {
    const info = await FileSystem.getInfoAsync(videoUrl, { size: true });
    return {
      size: 'size' in info && info.size ? info.size : 0,
      exists: info.exists ?? false,
      uri: videoUrl,
    };
  } catch (error) {
    return null;
  }
}
