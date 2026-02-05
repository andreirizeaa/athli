import { useState, useEffect, useRef } from 'react';

// Cache for generated video thumbnails
const videoThumbnailCache = new Map<string, string>();

/**
 * Hook to generate a thumbnail from a video URL by extracting the first frame
 */
export const useVideoThumbnail = (videoUrl: string | null | undefined) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoUrl) {
      setThumbnailUrl(null);
      return;
    }

    // Check cache first
    const cached = videoThumbnailCache.get(videoUrl);
    if (cached) {
      setThumbnailUrl(cached);
      return;
    }

    setIsLoading(true);

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';
    
    const handleLoadedData = () => {
      // Seek to 0.1 seconds to get a good frame (sometimes 0 is black)
      video.currentTime = 0.1;
    };

    const handleSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          // Cache the result
          videoThumbnailCache.set(videoUrl, dataUrl);
          setThumbnailUrl(dataUrl);
        }
      } catch (error) {
        console.error('Failed to generate video thumbnail:', error);
      } finally {
        setIsLoading(false);
        cleanup();
      }
    };

    const handleError = () => {
      console.error('Failed to load video for thumbnail:', videoUrl);
      setIsLoading(false);
      cleanup();
    };

    const cleanup = () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      video.src = '';
      video.load();
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);
    
    video.src = videoUrl;
    videoRef.current = video;

    return () => {
      cleanup();
    };
  }, [videoUrl]);

  return { thumbnailUrl, isLoading };
};

/**
 * Hook to generate thumbnails for multiple video URLs
 */
export const useVideoThumbnails = (videoUrls: (string | null | undefined)[]) => {
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const pendingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const urlsToLoad = videoUrls.filter((url): url is string => {
      if (!url) return false;
      // Skip if already cached or loading
      if (videoThumbnailCache.has(url)) return false;
      if (pendingRef.current.has(url)) return false;
      return true;
    });

    if (urlsToLoad.length === 0) {
      // Update from cache
      const cached = new Map<string, string>();
      videoUrls.forEach(url => {
        if (url && videoThumbnailCache.has(url)) {
          cached.set(url, videoThumbnailCache.get(url)!);
        }
      });
      if (cached.size > 0) {
        setThumbnails(prev => new Map([...prev, ...cached]));
      }
      return;
    }

    // Mark as pending
    urlsToLoad.forEach(url => pendingRef.current.add(url));
    setLoadingUrls(prev => new Set([...prev, ...urlsToLoad]));

    // Process URLs in sequence to avoid overwhelming the browser
    const processUrl = async (url: string): Promise<void> => {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.preload = 'metadata';

        const cleanup = () => {
          video.removeEventListener('loadeddata', handleLoadedData);
          video.removeEventListener('seeked', handleSeeked);
          video.removeEventListener('error', handleError);
          video.src = '';
          pendingRef.current.delete(url);
          setLoadingUrls(prev => {
            const next = new Set(prev);
            next.delete(url);
            return next;
          });
          resolve();
        };

        const handleLoadedData = () => {
          video.currentTime = 0.1;
        };

        const handleSeeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 320;
            canvas.height = video.videoHeight || 180;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
              
              videoThumbnailCache.set(url, dataUrl);
              setThumbnails(prev => new Map([...prev, [url, dataUrl]]));
            }
          } catch (error) {
            console.error('Failed to generate video thumbnail:', error);
          }
          cleanup();
        };

        const handleError = () => {
          cleanup();
        };

        video.addEventListener('loadeddata', handleLoadedData);
        video.addEventListener('seeked', handleSeeked);
        video.addEventListener('error', handleError);
        
        video.src = url;

        // Timeout after 10 seconds
        setTimeout(() => {
          if (pendingRef.current.has(url)) {
            cleanup();
          }
        }, 10000);
      });
    };

    // Process URLs with concurrency limit
    const processWithConcurrency = async () => {
      const concurrencyLimit = 3;
      const chunks: string[][] = [];
      
      for (let i = 0; i < urlsToLoad.length; i += concurrencyLimit) {
        chunks.push(urlsToLoad.slice(i, i + concurrencyLimit));
      }

      for (const chunk of chunks) {
        await Promise.all(chunk.map(processUrl));
      }
    };

    processWithConcurrency();
  }, [videoUrls.join(',')]);

  const getThumbnailUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    return thumbnails.get(url) || videoThumbnailCache.get(url) || null;
  };

  const isThumbnailLoading = (url: string | null | undefined): boolean => {
    if (!url) return false;
    return loadingUrls.has(url);
  };

  return { getThumbnailUrl, isThumbnailLoading };
};
