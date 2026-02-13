import { create } from 'zustand';
import type { CoachCompanyInfo } from '@/services/coach/coach-company-service';
import {
  fetchCompanyInfo,
  updateCompanyInfo,
} from '@/services/coach/coach-company-service';
import { Storage } from '@/lib/storage';

const COACH_COMPANY_KEY = '@athli:coach_company';

type CoachCompanyStore = {
  // State
  company: CoachCompanyInfo | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCompany: (company: CoachCompanyInfo | null) => void;
  loadCompany: () => Promise<void>;
  updateCompany: (
    updates: Partial<CoachCompanyInfo>
  ) => Promise<void>;
  clearCompany: () => void;
  initialize: () => void;
};

export const useCoachCompanyStore = create<CoachCompanyStore>((set, get) => ({
  // Initial state
  company: null,
  isLoading: false,
  error: null,

  // Initialize from storage
  initialize: () => {
    try {
      const savedCompany = Storage.getItem(COACH_COMPANY_KEY);
      if (savedCompany) {
        const company = JSON.parse(savedCompany) as CoachCompanyInfo;
        set({ company, error: null });
      }
    } catch (error) {
      console.error('[CoachCompanyStore] Failed to restore company from storage:', error);
      // Clear invalid data
      Storage.removeItem(COACH_COMPANY_KEY);
    }
  },

  // Set company directly
  setCompany: (company) => {
    set({ company, error: null });
    // Persist to storage
    if (company) {
      Storage.setItem(COACH_COMPANY_KEY, JSON.stringify(company));
    } else {
      Storage.removeItem(COACH_COMPANY_KEY);
    }
  },

  // Load company from database
  loadCompany: async () => {
    set({ isLoading: true, error: null });
    try {
      const company = await fetchCompanyInfo();
      set({ company, isLoading: false });
      // Persist to storage
      if (company) {
        Storage.setItem(COACH_COMPANY_KEY, JSON.stringify(company));
      }
    } catch (error: any) {
      console.error('Error loading coach company:', error);
      set({
        error: error.message || 'Failed to load coach company',
        isLoading: false,
      });
    }
  },

  // Update company
  updateCompany: async (updates) => {
    const { company } = get();

    set({ isLoading: true, error: null });
    try {
      const updatedCompany = await updateCompanyInfo(updates);
      set({ company: updatedCompany, isLoading: false });
      // Persist to storage
      Storage.setItem(COACH_COMPANY_KEY, JSON.stringify(updatedCompany));
    } catch (error: any) {
      console.error('Error updating coach company:', error);
      set({
        error: error.message || 'Failed to update coach company',
        isLoading: false,
      });
      throw error;
    }
  },

  // Clear company (on logout)
  clearCompany: () => {
    set({ company: null, error: null, isLoading: false });
    // Remove from storage
    Storage.removeItem(COACH_COMPANY_KEY);
  },
}));
