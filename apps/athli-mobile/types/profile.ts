export interface CoachProfile {
  id: string;
  email: string;
  name: string;
  profile_picture_url: string | null;
  signin_method: 'email' | 'google' | 'apple';
  is_active: boolean;
  is_archived: boolean;
  status: 'active' | 'inactive' | 'pending';
  unique_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientProfile {
  client_id: string;
  coach_id: string;
  email: string;
  name: string;
  profile_picture_url: string | null;
  signin_method: 'email' | 'google' | 'apple';
  date_of_birth: string | null;
  gender: string | null;
  height_cm: number | null;
  phone: string | null;
  country: string | null;
  unit_system: 'metric' | 'imperial' | null;
  created_at: string;
  updated_at: string;
}

export type ProfileType = 'coach' | 'client' | null;

export interface AuthResult {
  userId: string;
  profileType: ProfileType;
  profile: CoachProfile | ClientProfile | null;
}
