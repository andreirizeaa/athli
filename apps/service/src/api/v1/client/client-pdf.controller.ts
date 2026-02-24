import { Request, Response } from 'express';
import puppeteer, { type Browser } from 'puppeteer';
import { forbidden, notFound } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';
import { generateQuestionnairePdfHtml } from '@athli/shared-types/src/functions/pdf-template';

// Reuse browser instance across requests
let browserInstance: Browser | null = null;

const getBrowser = async (): Promise<Browser> => {
    if (browserInstance && browserInstance.connected) return browserInstance;
    browserInstance = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });
    return browserInstance;
};

// Pre-warm browser at module load
getBrowser().catch(() => {});

/**
 * Shared auth logic — resolves targetClientId and targetCoachId from headers.
 */
const resolveAuth = async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const clientIdHeader = req.header('x-client-id');
    const coachIdHeader = req.header('x-coach-id');
    const isCoachRequest = coachIdHeader && coachIdHeader === userId;

    if (isCoachRequest) {
        if (!clientIdHeader) {
            forbidden(res, { message: 'x-client-id header required for coach requests' });
            return null;
        }
        const supabase = getSupabaseClient();
        const { data: relation } = await supabase
            .from('coach_client_assignments')
            .select('client_id')
            .eq('coach_id', coachIdHeader)
            .eq('client_id', clientIdHeader)
            .single();
        if (!relation) {
            forbidden(res, { message: 'Client not assigned to this coach' });
            return null;
        }
        return { targetClientId: clientIdHeader, targetCoachId: coachIdHeader };
    }

    if (clientIdHeader && clientIdHeader !== userId) {
        forbidden(res, { message: "Cannot access another client's data" });
        return null;
    }
    const targetClientId = clientIdHeader || userId;
    let targetCoachId: string | undefined;
    if (coachIdHeader) {
        const supabase = getSupabaseClient();
        const { data: assignment } = await supabase
            .from('coach_client_assignments')
            .select('coach_id')
            .eq('client_id', targetClientId)
            .eq('coach_id', coachIdHeader)
            .single();
        if (!assignment) {
            forbidden(res, { message: 'Not assigned to this coach' });
            return null;
        }
        targetCoachId = coachIdHeader;
    }
    return { targetClientId, targetCoachId };
};

/**
 * Normalize answers from various DB formats into a consistent array.
 * Handles: array (pass-through), object with numeric keys ({"0": {"value": 8}}), or falsy (empty array).
 */
const normalizeAnswers = (answers: any, questions?: any[]): any[] => {
    if (!answers) return [];
    if (Array.isArray(answers)) {
        return answers.map((entry: any, index: number) => ({
            questionId: entry?.questionId || entry?.question_id || (questions?.[index] as any)?.id || '',
            answer: entry?.answer ?? entry?.value,
            format: entry?.format || (questions?.[index] as any)?.format,
        }));
    }
    if (typeof answers === 'object') {
        const keys = Object.keys(answers).sort((a, b) => Number(a) - Number(b));
        return keys.map((key, index) => {
            const entry = answers[key];
            return {
                questionId: entry?.questionId || entry?.question_id || (questions?.[index] as any)?.id || '',
                answer: entry?.answer ?? entry?.value,
                format: entry?.format || (questions?.[index] as any)?.format,
            };
        });
    }
    return [];
};

/**
 * Resolve signed URLs for all media answers in a form.
 */
const resolveMediaUrls = async (answers: any[]): Promise<Record<string, string>> => {
    const supabase = getSupabaseClient();
    const urls: Record<string, string> = {};
    const pathsToResolve: { path: string; bucket: string }[] = [];

    const isStoragePath = (val: any): val is string =>
        typeof val === 'string' && val.length > 0 && !val.startsWith('http') && !val.startsWith('data:') && !val.startsWith('__');

    for (const answer of answers) {
        if (!answer?.answer) continue;
        const fmt = answer.format;

        if ((fmt === 'images' || fmt === 'videos') && Array.isArray(answer.answer)) {
            for (const p of answer.answer) {
                if (isStoragePath(p)) pathsToResolve.push({ path: p, bucket: 'form_files' });
            }
        } else if (fmt === 'signature' && isStoragePath(answer.answer)) {
            pathsToResolve.push({ path: answer.answer, bucket: 'form_files' });
        } else if (fmt === 'progressPhoto' && typeof answer.answer === 'object') {
            for (const angle of ['front', 'back', 'side'] as const) {
                const p = answer.answer[angle];
                if (isStoragePath(p)) pathsToResolve.push({ path: p, bucket: 'client_photos' });
            }
        }
    }

    // Resolve in parallel
    await Promise.all(
        pathsToResolve.map(async ({ path, bucket }) => {
            try {
                const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
                if (data?.signedUrl) urls[path] = data.signedUrl;
            } catch {
                // skip failed URLs
            }
        }),
    );

    return urls;
};

export const clientPdfController = {
    /**
     * Generate PDF for a questionnaire
     * GET /client/forms/questionnaires/:id/pdf
     */
    getQuestionnairePdf: async (req: Request, res: Response) => {
        const auth = await resolveAuth(req, res);
        if (!auth) return;
        const { targetClientId, targetCoachId } = auth;
        const { id } = req.params;

        const supabase = getSupabaseClient();

        // Fetch questionnaire + profile in parallel
        let query = supabase.from('client_questionnaires').select('*').eq('id', id).eq('client_id', targetClientId);
        if (targetCoachId) query = query.eq('coach_id', targetCoachId);

        const [questionnaireResult, profileResult] = await Promise.all([
            query.single(),
            supabase.from('client_profiles_full').select('name, email').eq('client_id', targetClientId).single(),
        ]);

        const { data: questionnaire, error } = questionnaireResult;
        if (error || !questionnaire) return notFound(res, { message: 'Questionnaire not found' });
        const { data: profile } = profileResult;

        // Normalize answers (DB stores as [{value: "..."}] or {0: {value: ...}})
        const questions = questionnaire.questions || [];
        const answers = normalizeAnswers(questionnaire.answers, questions);

        // Resolve media URLs
        const resolvedMediaUrls = await resolveMediaUrls(answers);

        // Generate HTML
        const html = generateQuestionnairePdfHtml({
            name: questionnaire.name,
            clientName: profile?.name || 'Client',
            clientEmail: profile?.email,
            completedAt: questionnaire.completed_at ? new Date(questionnaire.completed_at) : undefined,
            questions,
            answers,
            resolvedMediaUrls,
        });

        // Render PDF with puppeteer
        const browser = await getBrowser();
        const page = await browser.newPage();
        try {
            await page.setContent(html, { waitUntil: 'load' });
            const pdfBuffer = await page.pdf({
                format: 'A4',
                margin: { top: '16mm', right: '16mm', bottom: '16mm', left: '16mm' },
                printBackground: true,
            });

            const fileName = `${questionnaire.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${(profile?.name || 'client').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Content-Length': pdfBuffer.length.toString(),
            });
            res.send(pdfBuffer);
        } finally {
            await page.close();
        }
    },

    /**
     * Generate PDF for a check-in submission
     * GET /client/forms/check-ins/:id/pdf
     */
    getCheckInPdf: async (req: Request, res: Response) => {
        const auth = await resolveAuth(req, res);
        if (!auth) return;
        const { targetClientId, targetCoachId } = auth;
        const { id } = req.params;
        const submissionId = req.query.submissionId as string | undefined;

        const supabase = getSupabaseClient();

        // Fetch check-in, submission, and profile in parallel
        let query = supabase.from('client_checkins').select('*').eq('id', id).eq('client_id', targetClientId);
        if (targetCoachId) query = query.eq('coach_id', targetCoachId);

        let logQuery = supabase
            .from('client_checkin_logs')
            .select('*')
            .eq('assignment_id', id)
            .eq('client_id', targetClientId)
            .order('submission_date', { ascending: false })
            .limit(1);
        if (submissionId) {
            logQuery = supabase.from('client_checkin_logs').select('*').eq('id', submissionId);
        }

        const [checkInResult, logsResult, profileResult] = await Promise.all([
            query.single(),
            logQuery,
            supabase.from('client_profiles_full').select('name, email').eq('client_id', targetClientId).single(),
        ]);

        const { data: checkIn, error } = checkInResult;
        if (error || !checkIn) return notFound(res, { message: 'Check-in not found' });
        const submission = logsResult.data?.[0];
        const { data: profile } = profileResult;

        const questions = checkIn.questions || [];
        const answers = normalizeAnswers(submission?.answers, questions);
        const resolvedMediaUrls = await resolveMediaUrls(answers);

        const html = generateQuestionnairePdfHtml({
            name: checkIn.name,
            clientName: profile?.name || 'Client',
            clientEmail: profile?.email,
            completedAt: submission?.submission_date ? new Date(submission.submission_date) : undefined,
            questions,
            answers,
            resolvedMediaUrls,
        });

        const browser = await getBrowser();
        const page = await browser.newPage();
        try {
            await page.setContent(html, { waitUntil: 'load' });
            const pdfBuffer = await page.pdf({
                format: 'A4',
                margin: { top: '16mm', right: '16mm', bottom: '16mm', left: '16mm' },
                printBackground: true,
            });

            const fileName = `${checkIn.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${(profile?.name || 'client').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Content-Length': pdfBuffer.length.toString(),
            });
            res.send(pdfBuffer);
        } finally {
            await page.close();
        }
    },
};
