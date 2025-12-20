export interface FormTemplateQuestion {
  question: string;
  required: boolean;
  format: string;
  options?: string[];
  scaleFrom?: string;
  scaleTo?: string;
  mediaCount?: number;
}

export interface FormTemplateSchedule {
  type: 'check-in' | 'questionnaire';
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  selectedDays?: string[];
  monthlyOption?: 'first' | 'last' | 'specific';
  specificDay?: number;
}

export interface FormTemplate {
  name: string;
  description?: string;
  questions: FormTemplateQuestion[];
  schedule?: FormTemplateSchedule;
}

export const formTemplates: FormTemplate[] = [
  {
    name: 'Initial Assessment',
    description: 'Comprehensive initial assessment form for new clients',
    schedule: {
      type: 'questionnaire',
    },
    questions: [
      {
        question: 'What is your primary fitness goal?',
        required: true,
        format: 'multipleChoice',
        options: ['Weight loss', 'Muscle gain', 'General fitness', 'Athletic performance', 'Rehabilitation'],
      },
      {
        question: 'How many days per week can you commit to training?',
        required: true,
        format: 'number',
      },
      {
        question: 'Rate your current fitness level',
        required: true,
        format: 'scale',
        scaleFrom: '1 / Beginner',
        scaleTo: '10 / Advanced',
      },
      {
        question: 'Do you have any previous injuries or medical conditions?',
        required: true,
        format: 'yesNo',
      },
      {
        question: 'Please describe any injuries or medical conditions',
        required: false,
        format: 'text',
      },
    ],
  },
  {
    name: 'Weekly Check-in',
    description: 'Weekly progress check-in form',
    schedule: {
      type: 'check-in',
      frequency: 'weekly',
      selectedDays: ['sunday'],
    },
    questions: [
      {
        question: 'How would you rate your week overall?',
        required: true,
        format: 'rating',
      },
      {
        question: 'Did you complete all scheduled workouts this week?',
        required: true,
        format: 'yesNo',
      },
      {
        question: 'How are you feeling physically?',
        required: true,
        format: 'scale',
        scaleFrom: '1 / Very poor',
        scaleTo: '10 / Excellent',
      },
      {
        question: 'Any challenges or concerns this week?',
        required: false,
        format: 'text',
      },
    ],
  },
  {
    name: 'Nutrition Log',
    description: 'Track daily nutrition and meal intake',
    schedule: {
      type: 'check-in',
      frequency: 'daily',
      selectedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
    questions: [
      {
        question: 'Upload photos of your meals today',
        required: true,
        format: 'images',
        mediaCount: 3,
      },
      {
        question: 'How many meals did you have today?',
        required: true,
        format: 'number',
      },
      {
        question: 'Did you meet your daily calorie target?',
        required: true,
        format: 'yesNo',
      },
      {
        question: 'Any notes about your nutrition today?',
        required: false,
        format: 'text',
      },
    ],
  },
  {
    name: 'Injury Assessment',
    description: 'Document and track injury details and recovery progress',
    schedule: {
      type: 'questionnaire',
    },
    questions: [
      {
        question: 'Where is the injury located?',
        required: true,
        format: 'multipleChoice',
        options: ['Shoulder', 'Knee', 'Back', 'Ankle', 'Wrist', 'Hip', 'Neck', 'Other'],
      },
      {
        question: 'Rate the pain level',
        required: true,
        format: 'scale',
        scaleFrom: '1 / No pain',
        scaleTo: '10 / Severe pain',
      },
      {
        question: 'When did the injury occur?',
        required: true,
        format: 'date',
      },
      {
        question: 'Please describe the injury and how it happened',
        required: true,
        format: 'text',
      },
      {
        question: 'Upload photos of the injury',
        required: false,
        format: 'images',
        mediaCount: 2,
      },
    ],
  },
  {
    name: 'Goal Setting',
    description: 'Set and track fitness and wellness goals',
    schedule: {
      type: 'questionnaire',
    },
    questions: [
      {
        question: 'What is your primary goal?',
        required: true,
        format: 'multipleChoice',
        options: ['Lose weight', 'Gain muscle', 'Improve endurance', 'Increase strength', 'Improve flexibility', 'General health'],
      },
      {
        question: 'What is your target weight (in kg)?',
        required: false,
        format: 'number',
      },
      {
        question: 'What is your target date to achieve this goal?',
        required: true,
        format: 'date',
      },
      {
        question: 'How confident are you in achieving this goal?',
        required: true,
        format: 'scale',
        scaleFrom: '1 / Not confident',
        scaleTo: '10 / Very confident',
      },
    ],
  },
  {
    name: 'Sleep Quality',
    description: 'Monitor sleep patterns and quality',
    schedule: {
      type: 'check-in',
      frequency: 'daily',
      selectedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
    questions: [
      {
        question: 'How many hours did you sleep last night?',
        required: true,
        format: 'number',
      },
      {
        question: 'Rate your sleep quality',
        required: true,
        format: 'rating',
      },
      {
        question: 'How rested do you feel?',
        required: true,
        format: 'scale',
        scaleFrom: '1 / Exhausted',
        scaleTo: '10 / Well rested',
      },
      {
        question: 'Did you have any sleep disturbances?',
        required: true,
        format: 'yesNo',
      },
    ],
  },
  {
    name: 'Pain Assessment',
    description: 'Track pain levels and locations',
    schedule: {
      type: 'questionnaire',
    },
    questions: [
      {
        question: 'Where are you experiencing pain?',
        required: true,
        format: 'multipleChoice',
        options: ['Head', 'Neck', 'Shoulder', 'Back', 'Hip', 'Knee', 'Ankle', 'Wrist', 'Other'],
      },
      {
        question: 'Rate your pain level',
        required: true,
        format: 'scale',
        scaleFrom: '1 / Mild',
        scaleTo: '10 / Severe',
      },
      {
        question: 'When did the pain start?',
        required: true,
        format: 'date',
      },
      {
        question: 'Describe the type of pain',
        required: false,
        format: 'text',
      },
    ],
  },
  {
    name: 'Mobility Test',
    description: 'Assess flexibility and range of motion',
    schedule: {
      type: 'questionnaire',
    },
    questions: [
      {
        question: 'Upload videos of your mobility exercises',
        required: true,
        format: 'videos',
        mediaCount: 2,
      },
      {
        question: 'Which areas are you testing?',
        required: true,
        format: 'multipleChoice',
        options: ['Shoulder mobility', 'Hip mobility', 'Spine mobility', 'Ankle mobility', 'Overall flexibility'],
      },
      {
        question: 'Rate your current mobility level',
        required: true,
        format: 'scale',
        scaleFrom: '1 / Very limited',
        scaleTo: '10 / Excellent',
      },
      {
        question: 'Any restrictions or limitations noted?',
        required: false,
        format: 'text',
      },
    ],
  },
  {
    name: 'Body Composition',
    description: 'Track body measurements and composition changes',
    schedule: {
      type: 'check-in',
      frequency: 'monthly',
      monthlyOption: 'last',
    },
    questions: [
      {
        question: 'Current weight (kg)',
        required: true,
        format: 'number',
      },
      {
        question: 'Upload body composition photos',
        required: true,
        format: 'images',
        mediaCount: 4,
      },
      {
        question: 'Body fat percentage (if known)',
        required: false,
        format: 'number',
      },
      {
        question: 'Measurement date',
        required: true,
        format: 'date',
      },
    ],
  },
  {
    name: 'Training Feedback',
    description: 'Collect feedback on training sessions',
    schedule: {
      type: 'check-in',
      frequency: 'daily',
      selectedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
    questions: [
      {
        question: 'Rate today\'s training session',
        required: true,
        format: 'rating',
      },
      {
        question: 'How challenging was the workout?',
        required: true,
        format: 'scale',
        scaleFrom: '1 / Too easy',
        scaleTo: '10 / Too hard',
      },
      {
        question: 'Did you complete all exercises?',
        required: true,
        format: 'yesNo',
      },
      {
        question: 'Any feedback or notes about the session?',
        required: false,
        format: 'text',
      },
    ],
  },
  {
    name: 'Wellness Check',
    description: 'General wellness and health status check',
    schedule: {
      type: 'check-in',
      frequency: 'weekly',
      selectedDays: ['sunday'],
    },
    questions: [
      {
        question: 'How would you rate your overall wellness today?',
        required: true,
        format: 'rating',
      },
      {
        question: 'Energy level',
        required: true,
        format: 'scale',
        scaleFrom: '1 / Very low',
        scaleTo: '10 / Very high',
      },
      {
        question: 'Stress level',
        required: true,
        format: 'scale',
        scaleFrom: '1 / No stress',
        scaleTo: '10 / Extreme stress',
      },
      {
        question: 'Any concerns or symptoms to report?',
        required: false,
        format: 'text',
      },
    ],
  },
  {
    name: 'Pre-Workout Assessment',
    description: 'Assess readiness before training sessions',
    schedule: {
      type: 'check-in',
      frequency: 'daily',
      selectedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
    questions: [
      {
        question: 'How is your energy level?',
        required: true,
        format: 'scale',
        scaleFrom: '1 / Very low',
        scaleTo: '10 / Very high',
      },
      {
        question: 'Are you experiencing any pain or discomfort?',
        required: true,
        format: 'yesNo',
      },
      {
        question: 'How many hours of sleep did you get?',
        required: true,
        format: 'number',
      },
      {
        question: 'Rate your readiness to train',
        required: true,
        format: 'rating',
      },
      {
        question: 'Any concerns before starting?',
        required: false,
        format: 'text',
      },
    ],
  },
];
