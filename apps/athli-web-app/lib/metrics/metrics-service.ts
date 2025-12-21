export interface Metric {
  id: string;
  name: string;
  unit: string;
  description?: string;
  createdAt: number;
}

/**
 * Duplicate a metric
 * @param metricId - ID of the metric to duplicate
 * @param originalMetric - Original metric object to duplicate
 */
export const duplicateMetric = async (metricId: string, originalMetric: Metric): Promise<Metric> => {
  // TODO: Connect to backend API
  console.log('Duplicating metric:', { metricId, originalMetric });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  // For now, create a duplicate with all properties copied and name appended with " (Copy)"
  const duplicatedMetric: Metric = {
    ...originalMetric,
    id: `metric-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: `${originalMetric.name} (Copy)`,
    createdAt: Date.now(),
  };

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/metrics/${metricId}/duplicate`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to duplicate metric')
  // return await response.json()

  return duplicatedMetric;
};
