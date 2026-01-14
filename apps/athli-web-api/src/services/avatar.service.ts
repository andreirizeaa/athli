import { getSupabaseClient } from './supabase.service';

class AvatarService {
    // Darker color palette for better contrast with white text (WCAG AA compliant)
    private colors = [
        '#1e40af', // Dark blue
        '#b91c1c', // Dark red
        '#047857', // Dark green
        '#7e22ce', // Dark purple
        '#ea580c', // Dark orange
        '#0f766e', // Dark teal
        '#be185d', // Dark pink
        '#4338ca', // Dark indigo
        '#065f46', // Dark emerald
        '#d97706'  // Dark amber
    ];

    /**
     * Generate a simple hash from a string
     */
    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Generate a default SVG avatar and upload it to Supabase storage
     */
    async generateDefaultAvatar(userId: string, name: string): Promise<string> {
        const initials = name
            .split(' ')
            .map(n => n.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);

        // Use deterministic color selection based on userId
        const colorIndex = this.hashString(userId) % this.colors.length;
        const color = this.colors[colorIndex];

        const svg = `
      <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" fill="${color}" />
        <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="32" font-weight="bold">
          ${initials || 'U'}
        </text>
      </svg>
    `.trim();

        const supabase = getSupabaseClient();
        const filePath = `${userId}/avatar.svg`;

        const { error: uploadError } = await supabase.storage
            .from('profile-pictures')
            .upload(filePath, svg, {
                contentType: 'image/svg+xml',
                upsert: true
            });

        if (uploadError) {
            console.error('Failed to upload default avatar:', uploadError);
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(filePath);

        return data.publicUrl;
    }

    /**
     * Upload a profile picture to Supabase storage
     */
    async uploadAvatar(userId: string, file: { buffer: Buffer, mimetype: string, originalname: string }): Promise<string> {
        const supabase = getSupabaseClient();
        const fileExt = file.originalname.split('.').pop();
        const fileName = `avatar-${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('profile-pictures')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (uploadError) {
            console.error('Failed to upload avatar:', uploadError);
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(filePath);

        return data.publicUrl;
    }
}

export const avatarService = new AvatarService();
