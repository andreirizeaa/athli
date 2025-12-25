export interface Metric {
  id: string;
  name: string;
  unit: string;
  description?: string;
  createdAt: number;
}

/**
 * Service method to get all coach's metrics (library)
 * This will be connected to the backend in the future
 */
export const getAllMetrics = async (): Promise<Metric[]> => {
  // TODO: Connect to backend API
  console.log('Getting all coach metrics');

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Mock data - in production this would come from the backend
  const mockMetrics: Metric[] = [
    {
      id: 'coach-metric-1',
      name: 'Body Fat Percentage',
      unit: '%',
      description: 'Total body fat percentage',
      createdAt: Date.now() - 86400000 * 30,
    },
    {
      id: 'coach-metric-2',
      name: 'Waist Circumference',
      unit: 'cm',
      description: 'Waist measurement',
      createdAt: Date.now() - 86400000 * 25,
    },
    {
      id: 'coach-metric-3',
      name: 'Resting Heart Rate',
      unit: 'bpm',
      description: 'Resting heart rate measurement',
      createdAt: Date.now() - 86400000 * 20,
    },
    {
      id: 'coach-metric-4',
      name: 'Sleep Duration',
      unit: 'hours',
      description: 'Average nightly sleep duration',
      createdAt: Date.now() - 86400000 * 15,
    },
  ];

  return mockMetrics;
};

/**
 * Duplicate a metric in coach's library
 * @param metricId - ID of the metric to duplicate
 * @param originalMetric - Original metric object to duplicate
 */
export const duplicateMetric = async (metricId: string, originalMetric: Metric): Promise<Metric> => {
  // TODO: Connect to backend API
  console.log('Duplicating metric:', { metricId, originalMetric });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  const duplicatedMetric: Metric = {
    ...originalMetric,
    id: `metric-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: `${originalMetric.name} (Copy)`,
    createdAt: Date.now(),
  };

  return duplicatedMetric;
};
