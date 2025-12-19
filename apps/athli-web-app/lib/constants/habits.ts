export interface DefaultHabit {
  name: string;
  amount: number;
  unit: string;
  period: 'daily' | 'weekly';
  description?: string;
  duration?: number;
  reminderTime?: string;
  reminderMessage?: string;
}

export interface HabitSection {
  label: string;
  habits: DefaultHabit[];
}

export const defaultHabits: HabitSection[] = [
  {
    label: 'Popular',
    habits: [
      {
        name: 'Daily steps',
        amount: 10000,
        unit: 'steps',
        period: 'daily',
        description: 'Track your daily step count to stay active',
      },
      {
        name: 'Drink water',
        amount: 8,
        unit: 'cups',
        period: 'daily',
        description: 'Stay hydrated throughout the day',
        reminderTime: '08:00',
        reminderMessage: 'Time to hydrate!',
      },
      {
        name: 'Meditate',
        amount: 10,
        unit: 'min',
        period: 'daily',
        description: 'Take time for mindfulness and mental clarity',
        duration: 10,
        reminderTime: '07:00',
        reminderMessage: 'Start your day with mindfulness',
      },
      {
        name: 'Mobility work',
        amount: 15,
        unit: 'min',
        period: 'daily',
        description: 'Improve flexibility and prevent injury',
        duration: 15,
      },
    ],
  },
  {
    label: 'Lifestyle',
    habits: [
      {
        name: 'Morning walk',
        amount: 30,
        unit: 'min',
        period: 'daily',
        description: 'Start your day with a refreshing walk',
        duration: 30,
        reminderTime: '06:30',
        reminderMessage: 'Time for your morning walk',
      },
      {
        name: 'Read',
        amount: 20,
        unit: 'min',
        period: 'daily',
        description: 'Expand your knowledge and relax',
        duration: 20,
      },
      {
        name: 'Journal',
        amount: 1,
        unit: 'times',
        period: 'daily',
        description: 'Reflect on your day and set intentions',
        reminderTime: '21:00',
        reminderMessage: 'Time to journal',
      },
      {
        name: 'Screen-free time',
        amount: 1,
        unit: 'hour',
        period: 'daily',
        description: 'Take a break from screens',
        duration: 60,
      },
      {
        name: 'Family time',
        amount: 30,
        unit: 'min',
        period: 'daily',
        description: 'Quality time with loved ones',
        duration: 30,
      },
      {
        name: 'Meal prep',
        amount: 1,
        unit: 'times',
        period: 'weekly',
        description: 'Prepare healthy meals for the week',
      },
    ],
  },
  {
    label: 'Mental Health',
    habits: [
      {
        name: 'Gratitude practice',
        amount: 3,
        unit: 'times',
        period: 'daily',
        description: 'List things you are grateful for',
        reminderTime: '20:00',
        reminderMessage: 'What are you grateful for today?',
      },
      {
        name: 'Deep breathing',
        amount: 5,
        unit: 'min',
        period: 'daily',
        description: 'Practice breathing exercises for stress relief',
        duration: 5,
      },
      {
        name: 'Nature time',
        amount: 20,
        unit: 'min',
        period: 'daily',
        description: 'Spend time outdoors in nature',
        duration: 20,
      },
      {
        name: 'Digital detox',
        amount: 2,
        unit: 'hour',
        period: 'daily',
        description: 'Unplug and recharge',
        duration: 120,
      },
      {
        name: 'Therapy session',
        amount: 1,
        unit: 'times',
        period: 'weekly',
        description: 'Regular mental health check-in',
      },
    ],
  },
  {
    label: 'Health & Fitness',
    habits: [
      {
        name: 'Strength training',
        amount: 3,
        unit: 'times',
        period: 'weekly',
        description: 'Build muscle and strength',
        duration: 45,
      },
      {
        name: 'Cardio workout',
        amount: 3,
        unit: 'times',
        period: 'weekly',
        description: 'Improve cardiovascular health',
        duration: 30,
      },
      {
        name: 'Stretching',
        amount: 10,
        unit: 'min',
        period: 'daily',
        description: 'Maintain flexibility and reduce soreness',
        duration: 10,
      },
      {
        name: 'Protein intake',
        amount: 120,
        unit: 'g',
        period: 'daily',
        description: 'Meet your daily protein goals',
      },
      {
        name: 'Vegetable servings',
        amount: 5,
        unit: 'count',
        period: 'daily',
        description: 'Get your daily vegetables',
      },
      {
        name: 'Sleep hours',
        amount: 8,
        unit: 'hour',
        period: 'daily',
        description: 'Prioritize quality sleep',
        duration: 480,
        reminderTime: '22:00',
        reminderMessage: 'Time to wind down for sleep',
      },
      {
        name: 'Active recovery',
        amount: 1,
        unit: 'times',
        period: 'weekly',
        description: 'Light activity on rest days',
        duration: 20,
      },
    ],
  },
  {
    label: 'Wellness',
    habits: [
      {
        name: 'Vitamin D',
        amount: 1,
        unit: 'times',
        period: 'daily',
        description: 'Get sunlight or supplement',
        reminderTime: '10:00',
        reminderMessage: 'Time for vitamin D',
      },
      {
        name: 'Fruit servings',
        amount: 2,
        unit: 'count',
        period: 'daily',
        description: 'Include fruits in your diet',
      },
      {
        name: 'Water intake',
        amount: 2,
        unit: 'l',
        period: 'daily',
        description: 'Stay properly hydrated',
        reminderTime: '09:00',
        reminderMessage: 'Drink water',
      },
      {
        name: 'Posture check',
        amount: 5,
        unit: 'times',
        period: 'daily',
        description: 'Check and correct your posture',
        reminderTime: '12:00',
        reminderMessage: 'Posture check',
      },
      {
        name: 'Self-care',
        amount: 1,
        unit: 'times',
        period: 'weekly',
        description: 'Dedicated time for self-care activities',
        duration: 60,
      },
    ],
  },
];

