import axiosInstance from '@/lib/axios';
import type { ClientQuestionnaireDetail } from '@/api/client/client-form-service';

interface DownloadQuestionnaireOptions {
  questionnaire: ClientQuestionnaireDetail;
  clientName: string;
  clientEmail?: string;
  clientId: string;
  coachId: string;
  resolvedMediaUrls?: Record<string, string>;
  formType?: 'questionnaire' | 'check-in';
  /** For check-ins: the assignment ID (required when formType is 'check-in') */
  checkInId?: string;
  /** For check-ins: the specific submission/log ID */
  submissionId?: string;
}

/**
 * Downloads a questionnaire or check-in PDF from the backend API.
 */
export const downloadQuestionnaire = async (options: DownloadQuestionnaireOptions): Promise<void> => {
  const { questionnaire, clientName, clientId, coachId, formType = 'questionnaire', checkInId, submissionId } = options;

  let url: string;
  if (formType === 'check-in') {
    const id = checkInId || questionnaire.id;
    url = `/client/forms/check-ins/${id}/pdf${submissionId ? `?submissionId=${submissionId}` : ''}`;
  } else {
    url = `/client/forms/questionnaires/${questionnaire.id}/pdf`;
  }

  const response = await axiosInstance.get(
    url,
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
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `${questionnaire.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
};
