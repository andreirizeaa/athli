import * as FileSystem from 'expo-file-system';
import { Video as VideoCompressor } from 'react-native-compressor';
import { supabase } from '../../lib/supabase';
import { showAlert } from '../alertService';

// Helper to get Supabase auth header for direct storage API calls
async function getSupabaseAuthHeader(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('No Supabase session');
  }
  return `Bearer ${data.session.access_token}`;
}

function inferExtensionFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.mp4')) return 'mp4';
  if (lower.endsWith('.mov')) return 'mov';
  if (lower.endsWith('.m4v')) return 'm4v';
  return 'mp4';
}

function contentTypeForExt(ext: string): string {
  switch (ext) {
    case 'mp4':
      return 'video/mp4';
    case 'mov':
      return 'video/quicktime';
    case 'm4v':
      return 'video/x-m4v';
    default:
      return 'application/octet-stream';
  }
}

function inferImageExtensionFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'jpg';
  if (lower.endsWith('.png')) return 'png';
  if (lower.startsWith('data:image/png')) return 'png';
  if (lower.startsWith('data:image/jpeg')) return 'jpg';
  return 'jpg';
}

function contentTypeForImageExt(ext: string): string {
  switch (ext) {
    case 'jpg':
      return 'image/jpeg';
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      return 'application/octet-stream';
  }
}

export async function uploadLiftVideo(
  userId: string,
  liftId: string,
  fileUri: string,
  assetId?: string,
  hasHdVideos?: boolean,
  normalizeOrientation?: boolean
): Promise<{ publicUrl: string; path: string }> {
  let uploadUri = fileUri;

  // Normalize orientation (bake rotation into pixels) when requested,
  // or compress if user doesn't have HD entitlement. We combine these into a single re-encode step.
  if (normalizeOrientation || !hasHdVideos) {
    try {
      // Re-encode ensures rotation is applied to pixels (no rotate metadata),
      // and also handles size reduction when HD entitlement is not present.
      const compressedPath = await VideoCompressor.compress(fileUri, {
        compressionMethod: 'manual',
        // If HD is enabled, keep higher quality and resolution to mostly preserve quality.
        // If not, keep existing 540p ~0.6 Mbps policy.
        bitrate: hasHdVideos ? 5_000_000 : 600_000,
        maxSize: hasHdVideos ? 1080 : 540,
        // Always allow compression/transcode so orientation gets normalized
        minimumFileSizeForCompress: 0,
      });

      uploadUri = compressedPath.startsWith('file://')
        ? compressedPath
        : `file://${compressedPath}`;

      // Validate compressed file; if missing/empty, fall back to original URI
      try {
        const info = await FileSystem.getInfoAsync(uploadUri);
        if (!info.exists || !info.size || info.size === 0) {
          // Fallback to original
          uploadUri = fileUri;
        }
      } catch (_) {
        // If we fail to stat the file, proceed but prefer original URI for safety
        uploadUri = fileUri;
      }
    } catch {
      uploadUri = fileUri; // fallback on compression failure
    }
  }

  const ext = inferExtensionFromUri(uploadUri);
  const contentType = contentTypeForExt(ext);

  // Use assetId as filename if provided, otherwise fallback to timestamp
  const fileName = assetId ? `${assetId}.${ext}` : `${Date.now()}.${ext}`;
  const path = `${userId}/${liftId}/videos/${fileName}`;

  // Use direct Supabase Storage API with native streaming - NO base64 conversion
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const url = `${supabaseUrl}/storage/v1/object/${encodeURIComponent('lifts')}/${encodeURIComponent(path)}`;
  const auth = await getSupabaseAuthHeader();

  // Stream the file directly from disk - this runs natively and won't block JS thread
  const result = await FileSystem.uploadAsync(url, uploadUri, {
    headers: {
      'Authorization': auth,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(
      `Video upload failed with status ${result.status}: ${result.body?.slice(0, 200)}`
    );
  }

  const { data } = supabase.storage.from('lifts').getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

export async function uploadLiftThumbnail(
  userId: string,
  liftId: string,
  fileUri: string
): Promise<{ publicUrl: string; path: string }> {
  const ext = inferImageExtensionFromUri(fileUri);
  const contentType = contentTypeForImageExt(ext);
  const fileName = `${Date.now()}.${ext}`;
  const path = `${userId}/${liftId}/thumbnails/${fileName}`;

  // Handle data URLs by writing to temp file first
  let uploadUri = fileUri;
  if (fileUri.startsWith('data:image/')) {
    const tmpPath = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(
      tmpPath,
      fileUri.replace(/^data:image\/(png|jpe?g);base64,/, ''),
      {
        encoding: FileSystem.EncodingType.Base64,
      }
    );
    uploadUri = tmpPath;
  }

  // Use direct Supabase Storage API with native streaming - NO base64 conversion
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const url = `${supabaseUrl}/storage/v1/object/${encodeURIComponent('lifts')}/${encodeURIComponent(path)}`;
  const auth = await getSupabaseAuthHeader();

  // Stream the file directly from disk - this runs natively and won't block JS thread
  const result = await FileSystem.uploadAsync(url, uploadUri, {
    headers: {
      'Authorization': auth,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(
      `Thumbnail upload failed with status ${result.status}: ${result.body?.slice(0, 200)}`
    );
  }

  const { data } = supabase.storage.from('lifts').getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

export async function listUserVideoPaths(userId: string): Promise<string[]> {
  try {
    // First, list all lift folders for the user
    const { data: liftFolders, error: liftFoldersError } = await supabase.storage
      .from('lifts')
      .list(userId, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (liftFoldersError) {
      showAlert(
        'Error',
        'Unable to access your videos. Please try again.',
        undefined,
        'VIDEO_UPLOAD_SERVICE_LIFT_FOLDERS_ERROR'
      );
      return [];
    }

    if (!liftFolders || liftFolders.length === 0) {
      return [];
    }

    // Collect all video assetIds from all lift folders
    const allAssetIds: string[] = [];

    for (const liftFolder of liftFolders) {
      if (liftFolder.name) {
        try {
          const { data: videos, error: videosError } = await supabase.storage
            .from('lifts')
            .list(`${userId}/${liftFolder.name}/videos`, {
              limit: 1000,
              sortBy: { column: 'created_at', order: 'desc' },
            });

          if (videosError) {
            showAlert(
              'Error',
              'Unable to access your videos. Please try again.',
              undefined,
              'VIDEO_UPLOAD_SERVICE_VIDEOS_ERROR'
            );
            continue;
          }

          // Add assetIds (filename without extension) for this lift
          const liftAssetIds =
            videos?.map((file) => {
              const lastDotIndex = file.name.lastIndexOf('.');
              return lastDotIndex > 0 ? file.name.substring(0, lastDotIndex) : file.name;
            }) || [];

          allAssetIds.push(...liftAssetIds);
        } catch (error) {
          showAlert(
            'Error',
            'Unable to process your videos. Please try again.',
            undefined,
            'VIDEO_UPLOAD_SERVICE_PROCESS_ERROR',
            error
          );
          continue;
        }
      }
    }

    return allAssetIds;
  } catch (error) {
    showAlert(
      'Error',
      'Unable to access your videos. Please try again.',
      undefined,
      'VIDEO_UPLOAD_SERVICE_GENERAL_ERROR',
      error
    );
    return [];
  }
}
