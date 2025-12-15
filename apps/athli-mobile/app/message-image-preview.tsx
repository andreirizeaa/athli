import { StatusBar } from 'expo-status-bar';
import ImagePreviewScreen from '@/components/camera/image-preview-screen';

export default function MessageImagePreviewPage() {
  return (
    <>
      <StatusBar hidden />
      <ImagePreviewScreen />
    </>
  );
}

