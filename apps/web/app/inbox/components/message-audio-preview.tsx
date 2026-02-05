'use client';

import React from 'react';

interface AudioAttachment {
  name: string;
  data: string;
  type: string;
  size: number;
  duration?: number;
}

interface MessageAudioPreviewProps {
  audio: AudioAttachment;
}

export function MessageAudioPreview({ audio }: MessageAudioPreviewProps) {
  return (
    <audio
      controls
      src={audio.data}
      className="w-full h-10"
    />
  );
}
