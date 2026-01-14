import React from 'react';
import { cn } from '@/lib/general/utils';

interface ImageAttachment {
  name: string;
  data: string;
  type: string;
  size: number;
}

interface MessageImageGridProps {
  images: ImageAttachment[];
  isSent: boolean;
  onImageClick?: (image: ImageAttachment, index: number) => void;
}

export function MessageImageGrid({ images, isSent, onImageClick }: MessageImageGridProps) {
  if (!images || images.length === 0) return null;

  // Single image - small thumbnail
  if (images.length === 1) {
    return (
      <div className="w-32">
        <button
          onClick={() => onImageClick?.(images[0], 0)}
          className="w-full aspect-square overflow-hidden rounded-lg hover:opacity-90 transition-opacity"
        >
          <img
            src={images[0].data}
            alt={images[0].name}
            className="w-full h-full object-cover"
          />
        </button>
      </div>
    );
  }

  // Two images - horizontal
  if (images.length === 2) {
    return (
      <div className="flex gap-1">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => onImageClick?.(image, index)}
            className="w-28 aspect-square overflow-hidden rounded-lg hover:opacity-90 transition-opacity"
          >
            <img
              src={image.data}
              alt={image.name}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    );
  }

  // Three images - 2 on top, 1 on bottom
  if (images.length === 3) {
    return (
      <div className="flex flex-col gap-1 w-56">
        <div className="grid grid-cols-2 gap-1">
          {images.slice(0, 2).map((image, index) => (
            <button
              key={index}
              onClick={() => onImageClick?.(image, index)}
              className="w-full aspect-square overflow-hidden rounded-lg hover:opacity-90 transition-opacity"
            >
              <img
                src={image.data}
                alt={image.name}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
        <button
          onClick={() => onImageClick?.(images[2], 2)}
          className="w-full aspect-[2/1] overflow-hidden rounded-lg hover:opacity-90 transition-opacity"
        >
          <img
            src={images[2].data}
            alt={images[2].name}
            className="w-full h-full object-cover"
          />
        </button>
      </div>
    );
  }

  // Four or more images - 2x2 grid with "+N" overlay on 4th image
  return (
    <div className="grid grid-cols-2 gap-1 w-56">
      {images.slice(0, 4).map((image, index) => (
        <button
          key={index}
          onClick={() => onImageClick?.(image, index)}
          className={cn(
            'w-full aspect-square overflow-hidden rounded-lg hover:opacity-90 transition-opacity relative',
            index === 3 && images.length > 4 && 'relative'
          )}
        >
          <img
            src={image.data}
            alt={image.name}
            className="w-full h-full object-cover"
          />
          {index === 3 && images.length > 4 && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white text-xl font-semibold">
                +{images.length - 4}
              </span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
