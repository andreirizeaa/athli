import { create } from 'zustand';
import type { CheckIn } from '@/services/coach/coach-check-in-service';
import type { Exercise } from '@/services/coach/coach-exercise-service';
import type { Habit } from '@/services/coach/coach-habit-service';
import type { Metric } from '@/services/coach/coach-metric-service';
import type { Questionnaire } from '@/services/coach/coach-questionnaire-service';
import type { Section } from '@/services/coach/coach-section-service';
import type { CoachFile } from '@/services/coach/coach-file-service';

// Workout type matching the service return
export interface Workout {
  id: string;
  name: string;
  description: string;
  type: string;
  difficulty: string;
  totalExercises: number;
  equipment: string;
  created: string; // Formatted date
  isFavourite: boolean;
}

interface LibraryStore {
  // State
  checkIns: CheckIn[];
  exercises: Exercise[];
  habits: Habit[];
  metrics: Metric[];
  questionnaires: Questionnaire[];
  sections: Section[];
  workouts: Workout[];
  files: CoachFile[];

  // Actions
  setCheckIns: (checkIns: CheckIn[]) => void;
  setExercises: (exercises: Exercise[]) => void;
  setHabits: (habits: Habit[]) => void;
  setMetrics: (metrics: Metric[]) => void;
  setQuestionnaires: (questionnaires: Questionnaire[]) => void;
  setSections: (sections: Section[]) => void;
  setWorkouts: (workouts: Workout[]) => void;
  setFiles: (files: CoachFile[]) => void;

  // Computed selectors (for filtered/sorted data)
  getFilteredCheckIns: (searchQuery: string) => CheckIn[];
  getFilteredExercises: (searchQuery: string) => Exercise[];
  getFilteredHabits: (searchQuery: string) => Habit[];
  getFilteredMetrics: (searchQuery: string) => Metric[];
  getFilteredQuestionnaires: (searchQuery: string) => Questionnaire[];
  getFilteredSections: (searchQuery: string) => Section[];
  getFilteredWorkouts: (searchQuery: string) => Workout[];
  getFilteredFiles: (searchQuery: string) => CoachFile[];
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  // Initial state
  checkIns: [],
  exercises: [],
  habits: [],
  metrics: [],
  questionnaires: [],
  sections: [],
  workouts: [],
  files: [],

  // Actions
  setCheckIns: (checkIns) => set({ checkIns }),
  setExercises: (exercises) => set({ exercises }),
  setHabits: (habits) => set({ habits }),
  setMetrics: (metrics) => set({ metrics }),
  setQuestionnaires: (questionnaires) => set({ questionnaires }),
  setSections: (sections) => set({ sections }),
  setWorkouts: (workouts) => set({ workouts }),
  setFiles: (files) => set({ files }),

  // Computed selectors
  getFilteredCheckIns: (searchQuery: string) => {
    const { checkIns } = get();
    if (!searchQuery) return checkIns;
    const query = searchQuery.toLowerCase();
    return checkIns.filter((item) => item.name.toLowerCase().includes(query));
  },

  getFilteredExercises: (searchQuery: string) => {
    const { exercises } = get();
    if (!searchQuery) return exercises;
    const query = searchQuery.toLowerCase();
    return exercises.filter((item) => item.name.toLowerCase().includes(query));
  },

  getFilteredHabits: (searchQuery: string) => {
    const { habits } = get();
    if (!searchQuery) return habits;
    const query = searchQuery.toLowerCase();
    return habits.filter((item) => item.name.toLowerCase().includes(query));
  },

  getFilteredMetrics: (searchQuery: string) => {
    const { metrics } = get();
    if (!searchQuery) return metrics;
    const query = searchQuery.toLowerCase();
    return metrics.filter((item) => item.name.toLowerCase().includes(query));
  },

  getFilteredQuestionnaires: (searchQuery: string) => {
    const { questionnaires } = get();
    if (!searchQuery) return questionnaires;
    const query = searchQuery.toLowerCase();
    return questionnaires.filter((item) => item.name.toLowerCase().includes(query));
  },

  getFilteredSections: (searchQuery: string) => {
    const { sections } = get();
    if (!searchQuery) return sections;
    const query = searchQuery.toLowerCase();
    return sections.filter((item) => item.program.toLowerCase().includes(query));
  },

  getFilteredWorkouts: (searchQuery: string) => {
    const { workouts } = get();
    if (!searchQuery) return workouts;
    const query = searchQuery.toLowerCase();
    return workouts.filter((item) => item.name.toLowerCase().includes(query));
  },

  getFilteredFiles: (searchQuery: string) => {
    const { files } = get();
    if (!searchQuery) return files;
    const query = searchQuery.toLowerCase();
    return files.filter((item) => item.filename.toLowerCase().includes(query));
  },
}));
