import { VideoPreviewScreen } from '@/components/features/camera/video-preview-screen';
import { DarkModeWrapper } from '@/components/ui/dark-mode-wrapper';

export default function VideoPreviewPage() {
  return (
    <DarkModeWrapper>
      <VideoPreviewScreen />
    </DarkModeWrapper>
  );
}
