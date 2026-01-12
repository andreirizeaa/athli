/**
 * DataInitializer - Initializes all app data fetching
 *
 * This component uses centralized hooks to fetch data and sync to Zustand stores.
 * It should be rendered once at the app root level.
 */

import { useEffect } from 'react';
import { useLibraryData } from '@/hooks/use-library-data';
import { useClientsData } from '@/hooks/use-clients-data';
import { useCoachProfileStore } from '@/stores';

export function DataInitializer() {
  const coachProfile = useCoachProfileStore((state) => state.profile);

  // Only fetch data if the user is authenticated as a coach
  const isAuthenticated = !!coachProfile;

  // Log authentication state changes
  useEffect(() => {
    console.log('[DataInitializer] Auth state changed:', {
      isAuthenticated,
      hasProfile: !!coachProfile,
      profileId: coachProfile?.id
    });
  }, [isAuthenticated, coachProfile]);

  // Initialize library data (check-ins, exercises, habits, etc.)
  // Pass authentication status to prevent queries when logged out
  const libraryData = useLibraryData(isAuthenticated);

  // Initialize clients data
  // Pass authentication status to prevent queries when logged out
  const clientsData = useClientsData(isAuthenticated);

  // Log loading states
  useEffect(() => {
    console.log('[DataInitializer] Loading states:', {
      libraryLoading: libraryData.isLoading,
      clientsLoading: clientsData.isLoading,
      libraryError: libraryData.isError,
      clientsError: clientsData.isError,
    });
  }, [libraryData.isLoading, clientsData.isLoading, libraryData.isError, clientsData.isError]);

  // Log any errors during data initialization
  useEffect(() => {
    if (libraryData.isError) {
      console.error('[DataInitializer] Error loading library data');
    }
    if (clientsData.isError) {
      console.error('[DataInitializer] Error loading clients data');
    }
  }, [libraryData.isError, clientsData.isError]);

  // This component doesn't render anything
  return null;
}
