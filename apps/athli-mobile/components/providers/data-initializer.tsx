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
  const shouldFetchData = !!coachProfile;

  // Initialize library data (check-ins, exercises, habits, etc.)
  const libraryData = useLibraryData();

  // Initialize clients data
  const clientsData = useClientsData();

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
