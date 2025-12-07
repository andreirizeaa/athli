import * as VideoThumbnails from 'expo-video-thumbnails';
import { showAlert } from '../services/alertService';

interface VideoThumbnailOptions {
  time?: number;
  quality?: number;
  headers?: Record<string, string>;
}

interface VideoThumbnailResult {
  uri: string;
  width: number;
  height: number;
}

/**
 * Generates a thumbnail image from a video URI
 * @param videoUri - The URI of the video (local or remote)
 * @param options - Optional configuration for thumbnail generation
 * @returns Promise<string> - The URI of the generated thumbnail image
 */
export async function generateVideoThumbnail(
  videoUri: string,
  options: VideoThumbnailOptions = {}
): Promise<string> {
  try {
    const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: options.time ?? 1000,
      quality: options.quality ?? 0.8, // Default quality 80%
      headers: options.headers,
    });

    return uri;
  } catch (error) {
    throw new Error(`Failed to generate thumbnail for video: ${videoUri}`);
  }
}

/**
 * Generates a thumbnail image from a video URI with full result data
 * @param videoUri - The URI of the video (local or remote)
 * @param options - Optional configuration for thumbnail generation
 * @returns Promise<VideoThumbnailResult> - The complete thumbnail result
 */
export async function generateVideoThumbnailWithMetadata(
  videoUri: string,
  options: VideoThumbnailOptions = {}
): Promise<VideoThumbnailResult> {
  try {
    const result = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: options.time ?? 15000, // Default to 15 seconds
      quality: options.quality ?? 0.8, // Default quality 80%
      headers: options.headers,
    });

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    showAlert(
      'Error',
      'Unable to generate video thumbnail. Please try again.',
      undefined,
      'GENERATE_VIDEO_THUMBNAIL_ERROR',
      error
    );
    throw new Error(`Failed to generate thumbnail for video: ${videoUri}`);
  }
}
