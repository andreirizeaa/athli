/**
 * DataInitializer - Initializes all app data fetching
 *
 * This component uses centralized hooks to fetch data and sync to Zustand stores.
 * It should be rendered once at the app root level.
 *
 * Updated to use the unified useAuth hook which ensures BOTH session AND profile
 * are ready before data fetching begins.
 */

import { useEffect } from 'react';
import { useLibraryData } from '@/hooks/use-library-data';
import { useClientsData } from '@/hooks/use-clients-data';
import { useAuth } from '@/stores';

export function DataInitializer() {
  // Use unified auth hook - waits for BOTH session AND profile
  const { isAuthenticated, isReady, coachProfile, isSessionReady } = useAuth();

  // Log authentication state changes
  useEffect(() => {
    console.log('[DataInitializer] Auth state changed:', {
      isSessionReady,
      isAuthenticated,
      isReady,
      hasProfile: !!coachProfile,
      profileId: coachProfile?.id
    });
  }, [isSessionReady, isAuthenticated, isReady, coachProfile]);

  // Initialize library data (check-ins, exercises, habits, etc.)
  // Wait until BOTH session AND profile are ready to prevent race conditions
  const libraryData = useLibraryData(isAuthenticated && isReady);

  // Initialize clients data
  // Wait until BOTH session AND profile are ready to prevent race conditions
  const clientsData = useClientsData(isAuthenticated && isReady);

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
