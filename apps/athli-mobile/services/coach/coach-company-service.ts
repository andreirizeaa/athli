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
    return response.data;
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
    return response.data;
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
 * Country options for location selection
 */
export const COUNTRY_OPTIONS = [
  { name: 'United States', code: 'US', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪' },
  { name: 'France', code: 'FR', flag: '🇫🇷' },
  { name: 'Italy', code: 'IT', flag: '🇮🇹' },
  { name: 'Spain', code: 'ES', flag: '🇪🇸' },
  { name: 'Netherlands', code: 'NL', flag: '🇳🇱' },
  { name: 'Belgium', code: 'BE', flag: '🇧🇪' },
  { name: 'Switzerland', code: 'CH', flag: '🇨🇭' },
  { name: 'Austria', code: 'AT', flag: '🇦🇹' },
  { name: 'Sweden', code: 'SE', flag: '🇸🇪' },
  { name: 'Norway', code: 'NO', flag: '🇳🇴' },
  { name: 'Denmark', code: 'DK', flag: '🇩🇰' },
  { name: 'Finland', code: 'FI', flag: '🇫🇮' },
  { name: 'Poland', code: 'PL', flag: '🇵🇱' },
  { name: 'Portugal', code: 'PT', flag: '🇵🇹' },
  { name: 'Ireland', code: 'IE', flag: '🇮🇪' },
  { name: 'Greece', code: 'GR', flag: '🇬🇷' },
  { name: 'Czech Republic', code: 'CZ', flag: '🇨🇿' },
  { name: 'Romania', code: 'RO', flag: '🇷🇴' },
  { name: 'Hungary', code: 'HU', flag: '🇭🇺' },
  { name: 'New Zealand', code: 'NZ', flag: '🇳🇿' },
  { name: 'South Africa', code: 'ZA', flag: '🇿🇦' },
  { name: 'Brazil', code: 'BR', flag: '🇧🇷' },
  { name: 'Mexico', code: 'MX', flag: '🇲🇽' },
  { name: 'Argentina', code: 'AR', flag: '🇦🇷' },
  { name: 'Chile', code: 'CL', flag: '🇨🇱' },
  { name: 'Japan', code: 'JP', flag: '🇯🇵' },
  { name: 'South Korea', code: 'KR', flag: '🇰🇷' },
  { name: 'China', code: 'CN', flag: '🇨🇳' },
  { name: 'India', code: 'IN', flag: '🇮🇳' },
  { name: 'Singapore', code: 'SG', flag: '🇸🇬' },
  { name: 'Hong Kong', code: 'HK', flag: '🇭🇰' },
  { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪' },
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦' },
  { name: 'Israel', code: 'IL', flag: '🇮🇱' },
  { name: 'Turkey', code: 'TR', flag: '🇹🇷' },
  { name: 'Russia', code: 'RU', flag: '🇷🇺' },
] as const;

export type CountryOption = (typeof COUNTRY_OPTIONS)[number];
