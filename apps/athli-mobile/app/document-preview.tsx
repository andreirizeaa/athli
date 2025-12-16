import DocumentPreviewScreen from '@/components/document/document-preview-screen';
import { DarkModeWrapper } from '@/components/dark-mode-wrapper';

export default function DocumentPreviewPage() {
  return (
    <DarkModeWrapper>
      <DocumentPreviewScreen />
    </DarkModeWrapper>
  );
}
