import { supabase } from '../lib/supabase';
import { clearAllUserData } from './storageService';

interface DeleteUserResponse {
  success: boolean;
  message: string;
  user_id: string;
}

export async function deleteUserAccount(userId: string): Promise<DeleteUserResponse> {
  if (!userId || !userId.trim()) throw new Error('userId is required');

  // Verify current session user matches userId (mimics backend JWT check)
  const { data: sess } = await supabase.auth.getSession();
  const sessionUserId = sess?.session?.user?.id;
  if (sessionUserId && sessionUserId !== userId) throw new Error('User mismatch');

  // Ensure user exists in users table
  const { data: existing, error: selErr } = await supabase
    .from('users')
    .select('user_id')
    .eq('user_id', userId.trim())
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  if (!existing) throw new Error('User not found');

  // Delete user from users table
  const { error: deleteUsersErr } = await supabase
    .from('users')
    .delete()
    .eq('user_id', userId.trim());
  if (deleteUsersErr) throw new Error(deleteUsersErr.message);

  // Delete user from user_info table
  const { error: deleteUserInfoErr } = await supabase
    .from('user_info')
    .delete()
    .eq('user_id', userId.trim());
  if (deleteUserInfoErr) throw new Error(deleteUserInfoErr.message);

  // Delete user from user_onboarding table
  const { error: deleteOnboardingErr } = await supabase
    .from('user_onboarding')
    .delete()
    .eq('user_id', userId.trim());
  if (deleteOnboardingErr) throw new Error(deleteOnboardingErr.message);

  // Clear all user data from AsyncStorage and memory
  await clearAllUserData();

  return {
    success: true,
    message: 'User successfully deleted',
    user_id: userId,
  };
}
