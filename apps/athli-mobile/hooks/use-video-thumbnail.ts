import { useState, useEffect, useCallback } from 'react';
import * as VideoThumbnails from 'expo-video-thumbnails';

type UseVideoThumbnailOptions = {
  enabled?: boolean;
  time?: number;
  quality?: number;
};

/**
 * Hook to generate a thumbnail from a video URL using expo-video-thumbnails
 * Works with any video URL including Supabase storage URLs
 *
 * @param videoUrl - The video URL to generate thumbnail from
 * @param options - Configuration options
 * @returns Object with thumbnailUrl and isLoading state
 */
export const useVideoThumbnail = (
  videoUrl: string | undefined | null,
  options?: UseVideoThumbnailOptions
) => {
  const { enabled = true, time = 1000, quality = 0.7 } = options || {};
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateThumbnail = useCallback(async () => {
    if (!videoUrl || !enabled) {
      setThumbnailUrl(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setThumbnailUrl(null);

    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUrl, {
        time,
        quality,
      });
      setThumbnailUrl(uri);
    } catch (error) {
      // Expected errors for inaccessible videos (expired URLs, network issues, etc.)
      // Fail silently - the UI should handle the missing thumbnail gracefully
      if (__DEV__) {
        console.debug('[useVideoThumbnail] Could not generate thumbnail - video may be inaccessible');
      }
      setThumbnailUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [videoUrl, enabled, time, quality]);

  useEffect(() => {
    generateThumbnail();
  }, [generateThumbnail]);

  return { thumbnailUrl, isLoading };
};

/**
 * Check if a URL is a Supabase storage URL
 */
export const isSupabaseUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return url.includes('supabase.co');
};

/**
 * Check if a URL is a YouTube URL
 */
export const isYouTubeUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname.includes('youtube.com') || hostname.includes('youtu.be');
  } catch {
    return false;
  }
};

/**
 * Check if a URL is a Vimeo URL
 */
export const isVimeoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname.includes('vimeo.com');
  } catch {
    return false;
  }
};

/**
 * Get YouTube thumbnail URL from a YouTube video URL
 */
export const getYouTubeThumbnail = (
  videoLink: string | null | undefined
): string | null => {
  if (!videoLink) return null;

  try {
    const url = new URL(videoLink);
    const hostname = url.hostname.toLowerCase();

    // YouTube
    if (hostname.includes('youtube.com')) {
      const videoId = url.searchParams.get('v');
      if (videoId) return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    } else if (hostname.includes('youtu.be')) {
      const videoId = url.pathname.slice(1);
      if (videoId) return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
  } catch {
    return null;
  }

  return null;
};

/**
 * Get Vimeo video ID from a Vimeo URL
 */
export const getVimeoVideoId = (
  videoLink: string | null | undefined
): string | null => {
  if (!videoLink) return null;

  try {
    const url = new URL(videoLink);
    const hostname = url.hostname.toLowerCase();

    if (hostname.includes('vimeo.com')) {
      // Handle formats like vimeo.com/123456789 or player.vimeo.com/video/123456789
      const pathParts = url.pathname.split('/').filter(Boolean);
      const videoId = pathParts.find((part) => /^\d+$/.test(part));
      return videoId || null;
    }
  } catch {
    return null;
  }

  return null;
};

/**
 * Detect video platform from URL
 */
export type VideoPlatform = 'youtube' | 'vimeo' | 'supabase' | 'unknown';

export const getVideoPlatform = (url: string | null | undefined): VideoPlatform => {
  if (!url) return 'unknown';
  if (isYouTubeUrl(url)) return 'youtube';
  if (isVimeoUrl(url)) return 'vimeo';
  if (isSupabaseUrl(url)) return 'supabase';
  return 'unknown';
};
