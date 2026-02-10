import { apiFetch } from '@/api/api-client';
import { createClient } from '@/supabase/client';

export interface CoachCompanyInfo {
    company_name: string;
    website?: string;
    linkedin?: string;
    location?: string;
    specialities: string[];
    logo_url?: string;
}

export async function getCoachCompany() {
    return apiFetch('/settings/coach/company');
}

export async function updateCoachCompany(updates: Partial<CoachCompanyInfo>) {
    return apiFetch('/settings/coach/company', {
        method: 'PATCH',
        body: JSON.stringify(updates),
    });
}

export async function markOnboardingComplete() {
    return apiFetch('/settings/coach/complete-onboarding', {
        method: 'POST',
    });
}

/**
 * Upload company logo to Supabase Storage
 */
export async function uploadCompanyLogo(file: File, coachId: string): Promise<string> {
    const supabase = createClient();

    // Validate file type
    if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size must be less than 5MB');
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${coachId}-${Date.now()}.${fileExt}`;
    const filePath = `${coachId}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('coach-company')
        .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
            cacheControl: '3600'
        });

    if (uploadError) {
        console.error('Core upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
    }

    if (!uploadData) {
        throw new Error('Upload succeeded but no data returned');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('coach-company')
        .getPublicUrl(filePath);

    return publicUrl;
}
