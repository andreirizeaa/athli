import { getSupabaseClient } from './supabase.service';

class AvatarService {
    private colors = [
        '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FF33A1',
        '#33FFF3', '#F3FF33', '#FF8C33', '#8C33FF', '#33FF8C'
    ];

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

        const color = this.colors[Math.floor(Math.random() * this.colors.length)];

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
}

export const avatarService = new AvatarService();
