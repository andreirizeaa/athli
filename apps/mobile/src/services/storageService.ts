// Stub implementation for storageService
// Returns null/empty values as these services are not needed

export async function getUserId(): Promise<string | null> {
  // Try to get user ID from Supabase session
  try {
    const { supabase } = await import('../lib/supabase');
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch (error) {
    return null;
  }
}

export async function setUserId(_userId: string): Promise<void> {
  // No-op
}

export async function removeUserId(): Promise<void> {
  // No-op
}

