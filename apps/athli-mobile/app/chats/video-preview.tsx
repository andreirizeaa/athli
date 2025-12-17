import { VideoPreviewScreen } from '@/components/camera/video-preview-screen';
import { DarkModeWrapper } from '@/components/dark-mode-wrapper';

export default function VideoPreviewPage() {
  return (
    <DarkModeWrapper>
      <VideoPreviewScreen />
    </DarkModeWrapper>
  );
}
