import axiosInstance from '@/lib/axios';
import type { ClientQuestionnaireDetail } from '@/api/client/client-form-service';

interface DownloadQuestionnaireOptions {
  questionnaire: ClientQuestionnaireDetail;
  clientName: string;
  clientEmail?: string;
  clientId: string;
  coachId: string;
  resolvedMediaUrls?: Record<string, string>;
}

/**
 * Downloads a questionnaire PDF from the backend API.
 */
export const downloadQuestionnaire = async (options: DownloadQuestionnaireOptions): Promise<void> => {
  const { questionnaire, clientName, clientId, coachId } = options;

  const response = await axiosInstance.get(
    `/client/forms/questionnaires/${questionnaire.id}/pdf`,
    {
      headers: {
        'x-client-id': clientId,
        'x-coach-id': coachId,
      },
      responseType: 'blob',
    },
  );

  // Trigger browser download
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${questionnaire.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
