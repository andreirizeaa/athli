/**
 * Shared PDF HTML Template Generator
 *
 * Generates an HTML string for questionnaire/check-in PDFs.
 * Matches the web jsPDF output exactly in layout, colors, and typography.
 */

import type { Question, QuestionAnswer } from '../schemas/form-schema';

export interface QuestionnairePdfData {
  name: string;
  clientName: string;
  clientEmail?: string;
  completedAt?: Date;
  questions: Question[];
  answers: QuestionAnswer[];
  resolvedMediaUrls?: Record<string, string>;
}

const getDateSuffix = (day: number): string => {
  if (day >= 11 && day <= 13) return 'th';
  const lastDigit = day % 10;
  switch (lastDigit) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

const formatDate = (date: Date): string => {
  const day = date.getDate();
  const suffix = getDateSuffix(day);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}${suffix} ${month}, ${year}`;
};

const formatTime = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${ampm}`;
};

const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const getAnswerHtml = (
  question: Question,
  answer: QuestionAnswer | undefined,
  resolvedMediaUrls?: Record<string, string>,
): string => {
  if (!answer || answer.answer === null || answer.answer === undefined) {
    return '<span class="no-answer">No answer provided</span>';
  }

  const resolveUrl = (path: string): string => {
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return resolvedMediaUrls?.[path] || path;
  };

  switch (question.format) {
    case 'text':
      return `<span class="answer-text">${escapeHtml(String(answer.answer))}</span>`;
    case 'number':
      return `<span class="answer-text">${escapeHtml(String(answer.answer))}</span>`;
    case 'multipleChoice':
      return `<span class="answer-text">${escapeHtml(String(answer.answer))}</span>`;
    case 'scale':
      return `<span class="answer-text">${answer.answer} out of ${question.scaleTo}</span>`;
    case 'yesNo':
      return `<span class="answer-text">${escapeHtml(String(answer.answer))}</span>`;
    case 'date':
      return `<span class="answer-text">${new Date(answer.answer as string).toLocaleDateString()}</span>`;
    case 'rating': {
      const rating = answer.answer as number;
      const filled = '&#9733;'.repeat(rating);
      const empty = '&#9734;'.repeat(5 - rating);
      return `<span class="answer-text">${filled}${empty}&nbsp;&nbsp;${rating}/5</span>`;
    }
    case 'images': {
      if (Array.isArray(answer.answer) && answer.answer.length > 0) {
        const imgs = (answer.answer as string[])
          .map((path) => {
            const url = resolveUrl(path);
            return url.startsWith('http') || url.startsWith('data:')
              ? `<img src="${escapeHtml(url)}" class="media-thumb" />`
              : '<div class="media-placeholder">Failed</div>';
          })
          .join('');
        return `<div class="media-row">${imgs}</div>`;
      }
      return '<span class="no-answer">No answer provided</span>';
    }
    case 'videos': {
      if (Array.isArray(answer.answer) && answer.answer.length > 0) {
        const thumbs = (answer.answer as string[])
          .map(() => '<div class="media-placeholder">Video</div>')
          .join('');
        return `<div class="media-row">${thumbs}</div>`;
      }
      return '<span class="no-answer">No answer provided</span>';
    }
    case 'signature': {
      if (typeof answer.answer === 'string' && answer.answer.length > 0) {
        const url = resolveUrl(answer.answer);
        if (url.startsWith('http') || url.startsWith('data:')) {
          return `<img src="${escapeHtml(url)}" class="signature-img" />`;
        }
      }
      return '<span class="no-answer">No answer provided</span>';
    }
    case 'progressPhoto': {
      if (typeof answer.answer === 'object' && answer.answer) {
        const pa = answer.answer as { front?: string; back?: string; side?: string };
        const angles = [
          { key: 'front', label: 'Front' },
          { key: 'back', label: 'Back' },
          { key: 'side', label: 'Side' },
        ];
        const imgs = angles
          .map(({ key }) => pa[key as keyof typeof pa])
          .filter((p): p is string => !!p);
        if (imgs.length > 0) {
          const cells = imgs
            .map((path) => {
              const url = resolveUrl(path);
              return url.startsWith('http') || url.startsWith('data:')
                ? `<img src="${escapeHtml(url)}" class="media-thumb" />`
                : '<div class="media-placeholder">Failed</div>';
            })
            .join('');
          return `<div class="media-row">${cells}</div>`;
        }
      }
      return '<span class="no-answer">No answer provided</span>';
    }
    default:
      return `<span class="answer-text">${escapeHtml(String(answer.answer))}</span>`;
  }
};

/**
 * Generates a complete HTML document string for a questionnaire PDF.
 * Layout matches the web jsPDF output: number column + question/answer grid.
 */
export const generateQuestionnairePdfHtml = (data: QuestionnairePdfData): string => {
  const { name, clientName, clientEmail, completedAt, questions, answers, resolvedMediaUrls } = data;

  const completionLine = completedAt
    ? `<div class="completion-date">Completed on ${formatDate(completedAt)} at ${formatTime(completedAt)}</div>`
    : '';

  const questionsHtml = questions
    .map((question, index) => {
      const answer = answers.find((a) => a.questionId === question.id);
      const answerContent = getAnswerHtml(question, answer, resolvedMediaUrls);
      const requiredMark = question.required ? '<span class="required"> *</span>' : '';

      return `
      <table class="question-block" cellspacing="0" cellpadding="0">
        <tr>
          <td class="num-cell" rowspan="2">${index + 1}</td>
          <td class="question-cell">${escapeHtml(question.question)}${requiredMark}</td>
        </tr>
        <tr>
          <td class="answer-cell">${answerContent}</td>
        </tr>
      </table>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page {
    margin: 16mm;
    size: A4;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Helvetica, Arial, sans-serif;
    color: #27272a;
    font-size: 9pt;
    background: #fff;
  }

  /* Header */
  .logo {
    font-size: 11pt;
    font-weight: bold;
    color: #18181b;
    margin-bottom: 16px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
  }
  .header-left {
    flex: 0.6;
  }
  .header-right {
    flex: 0.4;
    margin-left: 4px;
    background: #f4f4f5;
    border: 0.3pt solid #e4e4e7;
    border-radius: 0;
    padding: 6px;
  }
  .title {
    font-size: 18pt;
    font-weight: bold;
    color: #18181b;
    line-height: 1.2;
  }
  .completion-date {
    font-size: 9pt;
    color: #71717a;
    margin-top: 4px;
  }
  .client-name {
    font-size: 10pt;
    font-weight: bold;
    color: #18181b;
  }
  .client-email {
    font-size: 8pt;
    color: #71717a;
    margin-top: 2px;
  }

  /* Divider */
  .divider {
    border: none;
    border-top: 0.3pt solid #e4e4e7;
    margin: 10px 0;
  }

  /* Question grid - matches jsPDF layout */
  .question-block {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 0;
    table-layout: fixed;
  }
  .num-cell {
    width: 12mm;
    background: #f4f4f5;
    border: 0.3pt solid #e4e4e7;
    text-align: center;
    vertical-align: middle;
    font-size: 9pt;
    color: #71717a;
  }
  .question-cell {
    background: #f4f4f5;
    border: 0.3pt solid #e4e4e7;
    padding: 2pt 4pt;
    font-size: 9pt;
    font-weight: bold;
    color: #18181b;
    vertical-align: middle;
    line-height: 4.5pt;
    line-height: 1.3;
  }
  .answer-cell {
    border: 0.3pt solid #e4e4e7;
    padding: 5pt 4pt;
    font-size: 9pt;
    color: #27272a;
    vertical-align: top;
    min-height: 10pt;
  }
  .required {
    color: #dc2626;
    font-weight: bold;
  }

  /* Answer styles */
  .answer-text {
    font-size: 9pt;
    color: #27272a;
    white-space: pre-wrap;
  }
  .no-answer {
    font-size: 9pt;
    color: #71717a;
    font-style: italic;
  }

  /* Media */
  .media-row {
    display: flex;
    gap: 3pt;
    flex-wrap: wrap;
  }
  .media-thumb {
    width: 38pt;
    height: 38pt;
    object-fit: cover;
    border: 0.2pt solid #e4e4e7;
  }
  .media-placeholder {
    width: 38pt;
    height: 38pt;
    background: #f4f4f5;
    border: 0.3pt solid #e4e4e7;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 7pt;
    color: #71717a;
  }
  .signature-img {
    width: 100%;
    max-height: 60pt;
    object-fit: contain;
  }

  /* Footer */
  .footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    border-top: 0.2pt solid #e4e4e7;
    padding-top: 4pt;
    display: flex;
    justify-content: space-between;
    font-size: 7pt;
    color: #71717a;
  }
</style>
</head>
<body>
  <div class="logo">Athli</div>
  <div class="header">
    <div class="header-left">
      <div class="title">${escapeHtml(name)}</div>
      ${completionLine}
    </div>
    <div class="header-right">
      <div class="client-name">${escapeHtml(clientName)}</div>
      ${clientEmail ? `<div class="client-email">${escapeHtml(clientEmail)}</div>` : ''}
    </div>
  </div>
  <hr class="divider" />
  ${questionsHtml}
  <div class="footer">
    <span>Athli</span>
  </div>
</body>
</html>`;
};
