export interface DefaultMetric {
  name: string;
  unit: string;
}

export interface MetricSection {
  label: string;
  metrics: DefaultMetric[];
}

export const defaultMetrics: MetricSection[] = [
  {
    label: 'Body Composition',
    metrics: [
      {
        name: 'Body Fat',
        unit: '%',
      },
      {
        name: 'Body Mass',
        unit: 'kg',
      },
      {
        name: 'Muscle Mass',
        unit: 'kg',
      },
      {
        name: 'Lean Body Mass',
        unit: 'kg',
      },
      {
        name: 'Fat Mass',
        unit: 'kg',
      },
      {
        name: 'Bone Mass',
        unit: 'kg',
      },
      {
        name: 'Body Water',
        unit: '%',
      },
      {
        name: 'Visceral Fat',
        unit: 'level',
      },
    ],
  },
  {
    label: 'Body Measurements',
    metrics: [
      {
        name: 'Bicep',
        unit: 'cm',
      },
      {
        name: 'Tricep',
        unit: 'cm',
      },
      {
        name: 'Chest',
        unit: 'cm',
      },
      {
        name: 'Waist',
        unit: 'cm',
      },
      {
        name: 'Hip',
        unit: 'cm',
      },
      {
        name: 'Thigh',
        unit: 'cm',
      },
      {
        name: 'Calf',
        unit: 'cm',
      },
      {
        name: 'Neck',
        unit: 'cm',
      },
      {
        name: 'Shoulder',
        unit: 'cm',
      },
      {
        name: 'Forearm',
        unit: 'cm',
      },
    ],
  },
  {
    label: 'Performance',
    metrics: [
      {
        name: 'VO2 Max',
        unit: 'ml/kg/min',
      },
      {
        name: 'Resting Heart Rate',
        unit: 'bpm',
      },
      {
        name: 'Max Heart Rate',
        unit: 'bpm',
      },
      {
        name: 'Power Output',
        unit: 'W',
      },
      {
        name: '1RM Bench Press',
        unit: 'kg',
      },
      {
        name: '1RM Squat',
        unit: 'kg',
      },
      {
        name: '1RM Deadlift',
        unit: 'kg',
      },
      {
        name: 'Vertical Jump',
        unit: 'cm',
      },
    ],
  },
];
