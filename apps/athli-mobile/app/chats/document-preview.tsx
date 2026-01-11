import DocumentPreviewScreen from '@/components/features/document/document-preview-screen';
import { DarkModeWrapper } from '@/components/ui/dark-mode-wrapper';

export default function DocumentPreviewPage() {
  return (
    <DarkModeWrapper>
      <DocumentPreviewScreen />
    </DarkModeWrapper>
  );
}
