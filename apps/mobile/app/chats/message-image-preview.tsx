import ImagePreviewScreen from '@/components/features/camera/image-preview-screen';
import { DarkModeWrapper } from '@/components/ui/dark-mode-wrapper';

export default function MessageImagePreviewPage() {
  return (
    <DarkModeWrapper>
      <ImagePreviewScreen />
    </DarkModeWrapper>
  );
}

