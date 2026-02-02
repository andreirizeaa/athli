import type { ScheduleData } from '@/stores';

// DefaultMetric uses local ScheduleData type (different from MetricScheduleData which requires 'type')
export interface DefaultMetric {
    name: string;
    unit: string;
    schedule?: ScheduleData;
}

export interface MetricSection {
    label: string;
    metrics: DefaultMetric[];
}

// Helper schedules for common frequencies
const dailyScheduleAllDays: ScheduleData = {
    frequency: 'daily',
    selectedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
};

const dailyScheduleMWF: ScheduleData = {
    frequency: 'daily',
    selectedDays: ['monday', 'wednesday', 'friday'],
};

const weeklySchedule: ScheduleData = {
    frequency: 'weekly',
    selectedDays: ['sunday'],
};

const biweeklySchedule: ScheduleData = {
    frequency: 'biweekly',
    selectedDays: ['sunday'],
};

const monthlySchedule: ScheduleData = {
    frequency: 'monthly',
    monthlyOption: 'first',
};

export const defaultMetrics: MetricSection[] = [
    {
        label: 'Body Composition',
        metrics: [
            {
                name: 'Body Fat',
                unit: '%',
                schedule: weeklySchedule, // Easily measured with smart scale
            },
            {
                name: 'Body Weight',
                unit: 'kg',
                schedule: dailyScheduleMWF, // Common weigh-in days: Monday, Wednesday, Friday
            },
            {
                name: 'Muscle Mass',
                unit: 'kg',
                schedule: weeklySchedule, // Smart scale measurement
            },
            {
                name: 'Lean Body Mass',
                unit: 'kg',
                schedule: weeklySchedule, // Smart scale measurement
            },
            {
                name: 'Fat Mass',
                unit: 'kg',
                schedule: weeklySchedule, // Smart scale measurement
            },
            {
                name: 'Bone Mass',
                unit: 'kg',
                // No schedule - requires specialized equipment (DEXA scan)
            },
            {
                name: 'Body Water',
                unit: '%',
                schedule: weeklySchedule, // Smart scale measurement
            },
            {
                name: 'Visceral Fat',
                unit: 'level',
                schedule: weeklySchedule, // Smart scale measurement
            },
        ],
    },
    {
        label: 'Body Measurements',
        metrics: [
            {
                name: 'Bicep',
                unit: 'cm',
                schedule: biweeklySchedule, // Progress tracking
            },
            {
                name: 'Tricep',
                unit: 'cm',
                schedule: biweeklySchedule, // Progress tracking
            },
            {
                name: 'Chest',
                unit: 'cm',
                schedule: biweeklySchedule, // Progress tracking
            },
            {
                name: 'Waist',
                unit: 'cm',
                schedule: weeklySchedule, // Common progress metric
            },
            {
                name: 'Hip',
                unit: 'cm',
                schedule: biweeklySchedule, // Progress tracking
            },
            {
                name: 'Thigh',
                unit: 'cm',
                schedule: biweeklySchedule, // Progress tracking
            },
            {
                name: 'Calf',
                unit: 'cm',
                schedule: biweeklySchedule, // Progress tracking
            },
            {
                name: 'Neck',
                unit: 'cm',
                schedule: monthlySchedule, // Less frequently measured
            },
            {
                name: 'Shoulder',
                unit: 'cm',
                schedule: biweeklySchedule, // Progress tracking
            },
            {
                name: 'Forearm',
                unit: 'cm',
                schedule: biweeklySchedule, // Progress tracking
            },
        ],
    },
    {
        label: 'Performance',
        metrics: [
            {
                name: 'VO2 Max',
                unit: 'ml/kg/min',
                // No schedule - requires lab testing or specialized equipment
            },
            {
                name: 'Resting Heart Rate',
                unit: 'bpm',
                schedule: dailyScheduleAllDays, // Easily measured daily with most fitness devices
            },
            {
                name: 'Max Heart Rate',
                unit: 'bpm',
                // No schedule - typically tested periodically
            },
            {
                name: 'Power Output',
                unit: 'W',
                // No schedule - measured during specific training sessions
            },
            {
                name: '1RM Bench Press',
                unit: 'kg',
                schedule: monthlySchedule, // Periodized testing
            },
            {
                name: '1RM Squat',
                unit: 'kg',
                schedule: monthlySchedule, // Periodized testing
            },
            {
                name: '1RM Deadlift',
                unit: 'kg',
                schedule: monthlySchedule, // Periodized testing
            },
            {
                name: 'Vertical Jump',
                unit: 'cm',
                schedule: monthlySchedule, // Performance testing
            },
        ],
    },
];

