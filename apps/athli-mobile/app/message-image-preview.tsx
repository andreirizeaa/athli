import { StatusBar } from 'expo-status-bar';
import ImagePreviewScreen from '@/components/camera/image-preview-screen';
import { DarkModeWrapper } from '@/components/dark-mode-wrapper';

export default function MessageImagePreviewPage() {
  return (
    <DarkModeWrapper>
      <StatusBar hidden />
      <ImagePreviewScreen />
    </DarkModeWrapper>
  );
}

