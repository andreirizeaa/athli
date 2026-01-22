import { create } from 'zustand';
import type { Client } from '@/types';
import type { DefaultMetric } from '@/constants/metrics';
import type { DefaultHabit } from '@/constants/habits';
import type { Exercise } from '@/app/modals/workout/add-exercise-to-builder-modal';
import type { BuilderSection, BuilderItem } from '@/components/features/workout/workout-schema';
import type { ClientHabit } from '@/services/client/client-habit-service';
import type { ClientMetric } from '@/services/client/client-metric-service';
import type { Question } from '@/services/coach/coach-questionnaire-service';

type RepeatData = {
  type: 'weekly' | 'monthly';
  every?: number;
  for?: number | 'ever';
  weekdays?: string[];
  monthDays?: number[];
};

export type HabitOptionsData = {
  duration?: number;
  reminderTime?: string;
  reminderMessage?: string;
};

export type ScheduleFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type MonthlyOption = 'first' | 'last' | 'specific';

export type ScheduleData = {
  frequency: ScheduleFrequency;
  selectedDays?: string[];
  monthlyOption?: MonthlyOption;
  specificDay?: number;
};

type ModalCallbacksStore = {
  // Callbacks
  clientSelectCallback: ((client: Client) => void) | null;
  clientsSelectCallback: ((clients: Client[]) => void) | null;
  typeSelectCallback: ((type: string) => void) | null;
  repeatSelectCallback: ((data: RepeatData) => void) | null;
  numberSelectCallback: ((value: number | 'ever') => void) | null;
  habitOptionsCallback: ((data: HabitOptionsData) => void) | null;
  scheduleCallback: ((data: ScheduleData) => void) | null;
  metricSelectCallback: ((metric: DefaultMetric) => void) | null;
  habitSelectCallback: ((habit: DefaultHabit) => void) | null;
  clientHabitSelectCallback: ((habit: ClientHabit) => void) | null;
  clientMetricSelectCallback: ((metric: ClientMetric) => void) | null;
  dateSelectCallback: ((date: Date) => void) | null;
  exerciseSelectCallback: ((exercise: Exercise) => void) | null;
  exercisesSelectCallback: ((exercises: Exercise[]) => void) | null;
  sectionSelectCallback: ((section: BuilderSection) => void) | null;
  reorderCallback: ((items: BuilderItem[]) => void) | null;
  questionSelectCallback: ((question: Question) => void) | null;
  questionsReorderCallback: ((questions: Question[]) => void) | null;

  // Stored data
  storedRepeatData: RepeatData | null;
  storedHabitOptionsData: HabitOptionsData | null;
  storedScheduleData: ScheduleData | null;
  storedReorderItems: BuilderItem[] | null;
  storedReorderQuestions: Question[] | null;

  // Actions - Set callbacks
  setClientSelectCallback: (callback: (client: Client) => void) => void;
  setClientsSelectCallback: (callback: (clients: Client[]) => void) => void;
  setTypeSelectCallback: (callback: (type: string) => void) => void;
  setRepeatSelectCallback: (callback: (data: RepeatData) => void) => void;
  setNumberSelectCallback: (callback: (value: number | 'ever') => void) => void;
  setHabitOptionsCallback: (callback: (data: HabitOptionsData) => void) => void;
  setScheduleCallback: (callback: (data: ScheduleData) => void) => void;
  setMetricSelectCallback: (callback: (metric: DefaultMetric) => void) => void;
  setHabitSelectCallback: (callback: (habit: DefaultHabit) => void) => void;
  setClientHabitSelectCallback: (callback: (habit: ClientHabit) => void) => void;
  setClientMetricSelectCallback: (callback: (metric: ClientMetric) => void) => void;
  setDateSelectCallback: (callback: (date: Date) => void) => void;
  setExerciseSelectCallback: (callback: (exercise: Exercise) => void) => void;
  setExercisesSelectCallback: (callback: (exercises: Exercise[]) => void) => void;
  setSectionSelectCallback: (callback: (section: BuilderSection) => void) => void;
  setReorderCallback: (callback: (items: BuilderItem[]) => void) => void;
  setQuestionSelectCallback: (callback: (question: Question) => void) => void;
  setQuestionsReorderCallback: (callback: (questions: Question[]) => void) => void;

  // Actions - Trigger callbacks
  triggerClientSelect: (client: Client) => void;
  triggerClientsSelect: (clients: Client[]) => void;
  triggerTypeSelect: (type: string) => void;
  triggerRepeatSelect: (data: RepeatData) => void;
  triggerNumberSelect: (value: number | 'ever') => void;
  triggerHabitOptionsSelect: (data: HabitOptionsData) => void;
  triggerScheduleSelect: (data: ScheduleData) => void;
  triggerMetricSelect: (metric: DefaultMetric) => void;
  triggerHabitSelect: (habit: DefaultHabit) => void;
  triggerClientHabitSelect: (habit: ClientHabit) => void;
  triggerClientMetricSelect: (metric: ClientMetric) => void;
  triggerDateSelect: (date: Date) => void;
  triggerExerciseSelect: (exercise: Exercise) => void;
  triggerExercisesSelect: (exercises: Exercise[]) => void;
  triggerSectionSelect: (section: BuilderSection) => void;
  triggerReorder: (items: BuilderItem[]) => void;
  triggerQuestionSelect: (question: Question) => void;
  triggerQuestionsReorder: (questions: Question[]) => void;

  // Actions - Data management
  getRepeatData: () => RepeatData | null;
  setRepeatData: (data: RepeatData | null) => void;
  getHabitOptionsData: () => HabitOptionsData | null;
  setHabitOptionsData: (data: HabitOptionsData | null) => void;
  getScheduleData: () => ScheduleData | null;
  setScheduleData: (data: ScheduleData | null) => void;
  getReorderItems: () => BuilderItem[] | null;
  setReorderItems: (items: BuilderItem[] | null) => void;
  reorderQuestions: Question[] | null;
  setReorderQuestions: (questions: Question[] | null) => void;
};

export const useModalCallbacksStore = create<ModalCallbacksStore>((set, get) => ({
  // Initial state
  clientSelectCallback: null,
  clientsSelectCallback: null,
  typeSelectCallback: null,
  repeatSelectCallback: null,
  numberSelectCallback: null,
  habitOptionsCallback: null,
  scheduleCallback: null,
  metricSelectCallback: null,
  habitSelectCallback: null,
  clientHabitSelectCallback: null,
  clientMetricSelectCallback: null,
  dateSelectCallback: null,
  exerciseSelectCallback: null,
  exercisesSelectCallback: null,
  sectionSelectCallback: null,
  reorderCallback: null,
  questionSelectCallback: null,
  questionsReorderCallback: null,

  storedRepeatData: null,
  storedHabitOptionsData: null,
  storedScheduleData: null,
  storedReorderItems: null,
  storedReorderQuestions: null,
  reorderQuestions: null,

  // Set callback actions
  setClientSelectCallback: (callback) => set({ clientSelectCallback: callback }),
  setClientsSelectCallback: (callback) => set({ clientsSelectCallback: callback }),
  setTypeSelectCallback: (callback) => set({ typeSelectCallback: callback }),
  setRepeatSelectCallback: (callback) => set({ repeatSelectCallback: callback }),
  setNumberSelectCallback: (callback) => set({ numberSelectCallback: callback }),
  setHabitOptionsCallback: (callback) => set({ habitOptionsCallback: callback }),
  setScheduleCallback: (callback) => set({ scheduleCallback: callback }),
  setMetricSelectCallback: (callback) => set({ metricSelectCallback: callback }),
  setHabitSelectCallback: (callback) => set({ habitSelectCallback: callback }),
  setClientHabitSelectCallback: (callback) => set({ clientHabitSelectCallback: callback }),
  setClientMetricSelectCallback: (callback) => set({ clientMetricSelectCallback: callback }),
  setDateSelectCallback: (callback) => set({ dateSelectCallback: callback }),
  setExerciseSelectCallback: (callback) => set({ exerciseSelectCallback: callback }),
  setExercisesSelectCallback: (callback) => set({ exercisesSelectCallback: callback }),
  setSectionSelectCallback: (callback) => set({ sectionSelectCallback: callback }),
  setReorderCallback: (callback) => set({ reorderCallback: callback }),
  setQuestionSelectCallback: (callback) => set({ questionSelectCallback: callback }),
  setQuestionsReorderCallback: (callback) => set({ questionsReorderCallback: callback }),
  setReorderQuestions: (questions) => set({ storedReorderQuestions: questions, reorderQuestions: questions }),

  // Trigger callback actions
  triggerClientSelect: (client) => {
    const { clientSelectCallback } = get();
    if (clientSelectCallback) {
      clientSelectCallback(client);
    }
  },
  triggerClientsSelect: (clients) => {
    const { clientsSelectCallback } = get();
    if (clientsSelectCallback) {
      clientsSelectCallback(clients);
    }
  },
  triggerTypeSelect: (type) => {
    const { typeSelectCallback } = get();
    if (typeSelectCallback) {
      typeSelectCallback(type);
    }
  },
  triggerRepeatSelect: (data) => {
    const { repeatSelectCallback } = get();
    if (repeatSelectCallback) {
      repeatSelectCallback(data);
    }
  },
  triggerNumberSelect: (value) => {
    const { numberSelectCallback } = get();
    if (numberSelectCallback) {
      numberSelectCallback(value);
    }
  },
  triggerHabitOptionsSelect: (data) => {
    const { habitOptionsCallback } = get();
    if (habitOptionsCallback) {
      habitOptionsCallback(data);
    }
  },
  triggerScheduleSelect: (data) => {
    const { scheduleCallback } = get();
    if (scheduleCallback) {
      scheduleCallback(data);
    }
  },
  triggerMetricSelect: (metric) => {
    const { metricSelectCallback } = get();
    if (metricSelectCallback) {
      metricSelectCallback(metric);
    }
  },
  triggerHabitSelect: (habit) => {
    const { habitSelectCallback } = get();
    if (habitSelectCallback) {
      habitSelectCallback(habit);
    }
  },
  triggerClientHabitSelect: (habit) => {
    const { clientHabitSelectCallback } = get();
    if (clientHabitSelectCallback) {
      clientHabitSelectCallback(habit);
    }
  },
  triggerClientMetricSelect: (metric) => {
    const { clientMetricSelectCallback } = get();
    if (clientMetricSelectCallback) {
      clientMetricSelectCallback(metric);
    }
  },
  triggerDateSelect: (date) => {
    const { dateSelectCallback } = get();
    if (dateSelectCallback) {
      dateSelectCallback(date);
    }
  },
  triggerExerciseSelect: (exercise) => {
    const { exerciseSelectCallback } = get();
    if (exerciseSelectCallback) {
      exerciseSelectCallback(exercise);
    }
  },
  triggerExercisesSelect: (exercises) => {
    const { exercisesSelectCallback } = get();
    if (exercisesSelectCallback) {
      exercisesSelectCallback(exercises);
    }
  },
  triggerSectionSelect: (section) => {
    const { sectionSelectCallback } = get();
    if (sectionSelectCallback) {
      sectionSelectCallback(section);
    }
  },
  triggerReorder: (items) => {
    const { reorderCallback } = get();
    if (reorderCallback) {
      reorderCallback(items);
    }
  },
  triggerQuestionSelect: (question) => {
    const { questionSelectCallback } = get();
    if (questionSelectCallback) {
      questionSelectCallback(question);
    }
  },
  triggerQuestionsReorder: (questions) => {
    const { questionsReorderCallback } = get();
    if (questionsReorderCallback) {
      questionsReorderCallback(questions);
    }
  },

  // Data management
  getRepeatData: () => get().storedRepeatData,
  setRepeatData: (data) => set({ storedRepeatData: data }),
  getHabitOptionsData: () => get().storedHabitOptionsData,
  setHabitOptionsData: (data) => set({ storedHabitOptionsData: data }),
  getScheduleData: () => get().storedScheduleData,
  setScheduleData: (data) => set({ storedScheduleData: data }),
  getReorderItems: () => get().storedReorderItems,
  setReorderItems: (items) => set({ storedReorderItems: items }),
}));

// Backward compatibility aliases
export const habitOptionsData = () => useModalCallbacksStore.getState().storedHabitOptionsData;
export const scheduleData = () => useModalCallbacksStore.getState().storedScheduleData;
export const reorderItems = () => useModalCallbacksStore.getState().storedReorderItems;
