import jsPDF from 'jspdf';
import type { ClientQuestionnaireDetail, Question, QuestionAnswer } from '@/lib/api/client/client-form-service';

interface DownloadQuestionnaireOptions {
  questionnaire: ClientQuestionnaireDetail;
  clientName: string;
}

const getDateSuffix = (day: number): string => {
  if (day >= 11 && day <= 13) return 'th';
  const lastDigit = day % 10;
  switch (lastDigit) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
};

const formatDate = (date: Date): string => {
  const day = date.getDate();
  const suffix = getDateSuffix(day);
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `${day}${suffix} ${month}, ${year}`;
};

const getAnswerText = (question: Question, answer: QuestionAnswer | undefined): string | null => {
  if (!answer || answer.answer === null || answer.answer === undefined) {
    return 'No answer provided';
  }

  switch (question.format) {
    case 'text':
      return answer.answer as string;

    case 'number':
      return String(answer.answer);

    case 'multipleChoice':
      return answer.answer as string;

    case 'scale':
      return `${answer.answer} (Scale: ${question.scaleFrom} - ${question.scaleTo})`;

    case 'yesNo':
      return answer.answer as string;

    case 'date':
      return (answer.answer as Date).toLocaleDateString();

    case 'rating':
      return `${answer.answer}/5 stars`;

    case 'images':
    case 'videos':
      // Return null to indicate media should be embedded
      return null;

    default:
      return String(answer.answer);
  }
};

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * Downloads a questionnaire as a PDF
 */
export const downloadQuestionnaire = async (options: DownloadQuestionnaireOptions): Promise<void> => {
  const { questionnaire, clientName } = options;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const titleWidth = doc.getTextWidth(questionnaire.name);
  doc.text(questionnaire.name, (pageWidth - titleWidth) / 2, yPosition);
  yPosition += 10;

  // Subtitle with client name and completion date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  const completionDate = questionnaire.completedAt
    ? formatDate(questionnaire.completedAt)
    : 'Not completed';
  const subtitle = `${clientName} · ${completionDate}`;
  const subtitleWidth = doc.getTextWidth(subtitle);
  doc.text(subtitle, (pageWidth - subtitleWidth) / 2, yPosition);
  yPosition += 15;

  // Reset text color for content
  doc.setTextColor(0, 0, 0);

  // Questions and answers
  for (let index = 0; index < questionnaire.questions.length; index++) {
    const question = questionnaire.questions[index];
    const answer = questionnaire.answers.find((a) => a.questionId === question.id);

    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    // Question number and text
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const questionNumber = `${index + 1}.`;
    const questionText = question.required ? `${question.question} *` : question.question;

    // Split question text if it's too long
    const questionLines = doc.splitTextToSize(questionText, contentWidth - 15);
    doc.text(questionNumber, margin, yPosition);
    doc.text(questionLines, margin + 10, yPosition);
    yPosition += questionLines.length * 5 + 3;

    // Answer
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const answerText = getAnswerText(question, answer);

    // Handle media (images and videos)
    if (answerText === null && answer && (question.format === 'images' || question.format === 'videos')) {
      const mediaUrls = answer.answer as string[];

      if (mediaUrls && mediaUrls.length > 0) {
        const imageSize = 40; // Size of each thumbnail
        const imageSpacing = 5; // Spacing between images
        const imagesPerRow = Math.floor(contentWidth / (imageSize + imageSpacing));

        for (let i = 0; i < mediaUrls.length; i++) {
          try {
            // Check if we need a new page
            if (yPosition + imageSize > pageHeight - margin) {
              doc.addPage();
              yPosition = margin;
            }

            const img = await loadImage(mediaUrls[i]);

            // Calculate position in grid
            const col = i % imagesPerRow;
            const row = Math.floor(i / imagesPerRow);
            const xPosition = margin + 10 + (col * (imageSize + imageSpacing));
            const currentY = yPosition + (row * (imageSize + imageSpacing));

            // Add image to PDF
            doc.addImage(img, 'JPEG', xPosition, currentY, imageSize, imageSize);

            // If this is the last image in the row or the last image overall, update yPosition
            if (col === imagesPerRow - 1 || i === mediaUrls.length - 1) {
              yPosition = currentY + imageSize + imageSpacing;
            }
          } catch (error) {
            console.error(`Failed to load image: ${mediaUrls[i]}`, error);
            // Add placeholder text if image fails to load
            doc.text(`[Image ${i + 1} failed to load]`, margin + 10, yPosition);
            yPosition += 5;
          }
        }

        yPosition += 8;
      }
    } else if (answerText) {
      const answerLines = doc.splitTextToSize(answerText, contentWidth - 15);
      doc.text(answerLines, margin + 10, yPosition);
      yPosition += answerLines.length * 5 + 8;
    }
  }

  // Download the PDF
  const fileName = `${questionnaire.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
  doc.save(fileName);
};
