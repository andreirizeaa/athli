export interface Metric {
  id: string;
  name: string;
  unit: string;
  description?: string;
  createdAt: number;
}

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
