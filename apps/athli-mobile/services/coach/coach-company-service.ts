import axiosInstance from '@/lib/axios';
import { supabase } from '@/lib/supabase';

export interface CoachCompanyInfo {
  company_name: string;
  website?: string;
  linkedin?: string;
  location?: string;
  specialities: string[];
  logo_url?: string;
}

/**
 * Fetch coach company information
 */
export async function fetchCompanyInfo(): Promise<CoachCompanyInfo | null> {
  try {
    const response = await axiosInstance.get('/settings/coach/company');
    // Handle nested response structure: { success, message, data: { company: {...} } }
    const result = response.data;
    return result?.data?.company || result?.data || result;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error('Error fetching company info:', error);
    throw error;
  }
}

/**
 * Update coach company information
 */
export async function updateCompanyInfo(
  updates: Partial<CoachCompanyInfo>
): Promise<CoachCompanyInfo> {
  try {
    const response = await axiosInstance.patch('/settings/coach/company', updates);
    // Handle nested response structure: { success, message, data: { company: {...} } }
    const result = response.data;
    return result?.data?.company || result?.data || result;
  } catch (error) {
    console.error('Error updating company info:', error);
    throw error;
  }
}

/**
 * Upload company logo to Supabase Storage
 */
export async function uploadCompanyLogo(
  uri: string,
  coachId: string
): Promise<string> {
  // Convert uri to blob
  const response = await fetch(uri);
  const blob = await response.blob();

  // Validate file type
  if (!blob.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 5MB)
  if (blob.size > 5 * 1024 * 1024) {
    throw new Error('Image size must be less than 5MB');
  }

  // Get file extension from content type
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  const fileExt = extMap[blob.type] || 'jpg';
  const fileName = `${coachId}-${Date.now()}.${fileExt}`;
  const filePath = `${coachId}/${fileName}`;

  // Convert blob to ArrayBuffer for Supabase upload
  const arrayBuffer = await blob.arrayBuffer();

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('coach-company')
    .upload(filePath, arrayBuffer, {
      upsert: true,
      contentType: blob.type,
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error('Company logo upload error:', uploadError);
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  if (!uploadData) {
    throw new Error('Upload succeeded but no data returned');
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('coach-company').getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Speciality options for company profile
 */
export const SPECIALITY_OPTIONS = [
  { label: 'Physiotherapy', value: 'physiotherapy' },
  { label: 'Personal Training', value: 'personal-training' },
  { label: 'Strength', value: 'strength' },
  { label: 'Mobility', value: 'mobility' },
  { label: 'Cardio', value: 'cardio' },
  { label: 'Yoga', value: 'yoga' },
  { label: 'Pilates', value: 'pilates' },
  { label: 'CrossFit', value: 'crossfit' },
  { label: 'Weightlifting', value: 'weightlifting' },
  { label: 'Powerlifting', value: 'powerlifting' },
  { label: 'Bodybuilding', value: 'bodybuilding' },
  { label: 'Functional Training', value: 'functional-training' },
  { label: 'Sports Performance', value: 'sports-performance' },
  { label: 'Rehabilitation', value: 'rehabilitation' },
  { label: 'Injury Prevention', value: 'injury-prevention' },
  { label: 'Nutrition', value: 'nutrition' },
  { label: 'Wellness Coaching', value: 'wellness-coaching' },
  { label: 'Group Fitness', value: 'group-fitness' },
  { label: 'Senior Fitness', value: 'senior-fitness' },
  { label: 'Youth Training', value: 'youth-training' },
  { label: 'Athletic Development', value: 'athletic-development' },
  { label: 'Corrective Exercise', value: 'corrective-exercise' },
  { label: 'Flexibility', value: 'flexibility' },
  { label: 'Endurance Training', value: 'endurance-training' },
  { label: 'Speed & Agility', value: 'speed-agility' },
] as const;

/**
 * Country options for location selection (comprehensive list matching web app)
 * Sorted alphabetically by name
 */
export const COUNTRY_OPTIONS: CountryOption[] = [
  { name: 'Afghanistan', code: 'AF', flag: '🇦🇫' },
  { name: 'Albania', code: 'AL', flag: '🇦🇱' },
  { name: 'Algeria', code: 'DZ', flag: '🇩🇿' },
  { name: 'Andorra', code: 'AD', flag: '🇦🇩' },
  { name: 'Angola', code: 'AO', flag: '🇦🇴' },
  { name: 'Argentina', code: 'AR', flag: '🇦🇷' },
  { name: 'Armenia', code: 'AM', flag: '🇦🇲' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺' },
  { name: 'Austria', code: 'AT', flag: '🇦🇹' },
  { name: 'Azerbaijan', code: 'AZ', flag: '🇦🇿' },
  { name: 'Bahrain', code: 'BH', flag: '🇧🇭' },
  { name: 'Bangladesh', code: 'BD', flag: '🇧🇩' },
  { name: 'Belarus', code: 'BY', flag: '🇧🇾' },
  { name: 'Belgium', code: 'BE', flag: '🇧🇪' },
  { name: 'Bolivia', code: 'BO', flag: '🇧🇴' },
  { name: 'Bosnia and Herzegovina', code: 'BA', flag: '🇧🇦' },
  { name: 'Brazil', code: 'BR', flag: '🇧🇷' },
  { name: 'Bulgaria', code: 'BG', flag: '🇧🇬' },
  { name: 'Cambodia', code: 'KH', flag: '🇰🇭' },
  { name: 'Cameroon', code: 'CM', flag: '🇨🇲' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦' },
  { name: 'Chile', code: 'CL', flag: '🇨🇱' },
  { name: 'China', code: 'CN', flag: '🇨🇳' },
  { name: 'Colombia', code: 'CO', flag: '🇨🇴' },
  { name: 'Costa Rica', code: 'CR', flag: '🇨🇷' },
  { name: 'Croatia', code: 'HR', flag: '🇭🇷' },
  { name: 'Cuba', code: 'CU', flag: '🇨🇺' },
  { name: 'Cyprus', code: 'CY', flag: '🇨🇾' },
  { name: 'Czech Republic', code: 'CZ', flag: '🇨🇿' },
  { name: 'Denmark', code: 'DK', flag: '🇩🇰' },
  { name: 'Dominican Republic', code: 'DO', flag: '🇩🇴' },
  { name: 'Ecuador', code: 'EC', flag: '🇪🇨' },
  { name: 'Egypt', code: 'EG', flag: '🇪🇬' },
  { name: 'Estonia', code: 'EE', flag: '🇪🇪' },
  { name: 'Ethiopia', code: 'ET', flag: '🇪🇹' },
  { name: 'Finland', code: 'FI', flag: '🇫🇮' },
  { name: 'France', code: 'FR', flag: '🇫🇷' },
  { name: 'Georgia', code: 'GE', flag: '🇬🇪' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪' },
  { name: 'Ghana', code: 'GH', flag: '🇬🇭' },
  { name: 'Greece', code: 'GR', flag: '🇬🇷' },
  { name: 'Guatemala', code: 'GT', flag: '🇬🇹' },
  { name: 'Hong Kong', code: 'HK', flag: '🇭🇰' },
  { name: 'Hungary', code: 'HU', flag: '🇭🇺' },
  { name: 'Iceland', code: 'IS', flag: '🇮🇸' },
  { name: 'India', code: 'IN', flag: '🇮🇳' },
  { name: 'Indonesia', code: 'ID', flag: '🇮🇩' },
  { name: 'Iran', code: 'IR', flag: '🇮🇷' },
  { name: 'Iraq', code: 'IQ', flag: '🇮🇶' },
  { name: 'Ireland', code: 'IE', flag: '🇮🇪' },
  { name: 'Israel', code: 'IL', flag: '🇮🇱' },
  { name: 'Italy', code: 'IT', flag: '🇮🇹' },
  { name: 'Jamaica', code: 'JM', flag: '🇯🇲' },
  { name: 'Japan', code: 'JP', flag: '🇯🇵' },
  { name: 'Jordan', code: 'JO', flag: '🇯🇴' },
  { name: 'Kazakhstan', code: 'KZ', flag: '🇰🇿' },
  { name: 'Kenya', code: 'KE', flag: '🇰🇪' },
  { name: 'Kuwait', code: 'KW', flag: '🇰🇼' },
  { name: 'Latvia', code: 'LV', flag: '🇱🇻' },
  { name: 'Lebanon', code: 'LB', flag: '🇱🇧' },
  { name: 'Lithuania', code: 'LT', flag: '🇱🇹' },
  { name: 'Luxembourg', code: 'LU', flag: '🇱🇺' },
  { name: 'Malaysia', code: 'MY', flag: '🇲🇾' },
  { name: 'Malta', code: 'MT', flag: '🇲🇹' },
  { name: 'Mexico', code: 'MX', flag: '🇲🇽' },
  { name: 'Moldova', code: 'MD', flag: '🇲🇩' },
  { name: 'Monaco', code: 'MC', flag: '🇲🇨' },
  { name: 'Mongolia', code: 'MN', flag: '🇲🇳' },
  { name: 'Montenegro', code: 'ME', flag: '🇲🇪' },
  { name: 'Morocco', code: 'MA', flag: '🇲🇦' },
  { name: 'Nepal', code: 'NP', flag: '🇳🇵' },
  { name: 'Netherlands', code: 'NL', flag: '🇳🇱' },
  { name: 'New Zealand', code: 'NZ', flag: '🇳🇿' },
  { name: 'Nigeria', code: 'NG', flag: '🇳🇬' },
  { name: 'North Macedonia', code: 'MK', flag: '🇲🇰' },
  { name: 'Norway', code: 'NO', flag: '🇳🇴' },
  { name: 'Oman', code: 'OM', flag: '🇴🇲' },
  { name: 'Pakistan', code: 'PK', flag: '🇵🇰' },
  { name: 'Panama', code: 'PA', flag: '🇵🇦' },
  { name: 'Paraguay', code: 'PY', flag: '🇵🇾' },
  { name: 'Peru', code: 'PE', flag: '🇵🇪' },
  { name: 'Philippines', code: 'PH', flag: '🇵🇭' },
  { name: 'Poland', code: 'PL', flag: '🇵🇱' },
  { name: 'Portugal', code: 'PT', flag: '🇵🇹' },
  { name: 'Puerto Rico', code: 'PR', flag: '🇵🇷' },
  { name: 'Qatar', code: 'QA', flag: '🇶🇦' },
  { name: 'Romania', code: 'RO', flag: '🇷🇴' },
  { name: 'Russia', code: 'RU', flag: '🇷🇺' },
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦' },
  { name: 'Serbia', code: 'RS', flag: '🇷🇸' },
  { name: 'Singapore', code: 'SG', flag: '🇸🇬' },
  { name: 'Slovakia', code: 'SK', flag: '🇸🇰' },
  { name: 'Slovenia', code: 'SI', flag: '🇸🇮' },
  { name: 'South Africa', code: 'ZA', flag: '🇿🇦' },
  { name: 'South Korea', code: 'KR', flag: '🇰🇷' },
  { name: 'Spain', code: 'ES', flag: '🇪🇸' },
  { name: 'Sri Lanka', code: 'LK', flag: '🇱🇰' },
  { name: 'Sweden', code: 'SE', flag: '🇸🇪' },
  { name: 'Switzerland', code: 'CH', flag: '🇨🇭' },
  { name: 'Taiwan', code: 'TW', flag: '🇹🇼' },
  { name: 'Thailand', code: 'TH', flag: '🇹🇭' },
  { name: 'Tunisia', code: 'TN', flag: '🇹🇳' },
  { name: 'Turkey', code: 'TR', flag: '🇹🇷' },
  { name: 'Ukraine', code: 'UA', flag: '🇺🇦' },
  { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪' },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧' },
  { name: 'United States', code: 'US', flag: '🇺🇸' },
  { name: 'Uruguay', code: 'UY', flag: '🇺🇾' },
  { name: 'Uzbekistan', code: 'UZ', flag: '🇺🇿' },
  { name: 'Venezuela', code: 'VE', flag: '🇻🇪' },
  { name: 'Vietnam', code: 'VN', flag: '🇻🇳' },
];

export type CountryOption = { name: string; code: string; flag: string };

/**
 * Find a country by name or code
 */
export function findCountry(value: string | undefined): CountryOption | undefined {
  if (!value) return undefined;
  return COUNTRY_OPTIONS.find(
    (c) => c.name === value || c.code === value || c.code.toLowerCase() === value.toLowerCase()
  );
}
