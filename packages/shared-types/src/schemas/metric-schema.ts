/**
 * Metric Types
 *
 * Shared types for metrics used across web and mobile apps.
 */

// =============================================================================
// Core Metric Types
// =============================================================================

export type MetricValueKind = 'number' | 'percent' | 'duration' | 'score';

export interface MetricScheduleData {
  type: 'metric';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  selectedDays?: string[];
  monthlyOption?: 'first' | 'last' | 'specific';
  specificDay?: number;
}

export interface Metric {
  id: string;
  coach_id: string;
  name: string;
  unit: string;
  description?: string;
  value_kind: MetricValueKind;
  min_value?: number;
  max_value?: number;
  schedule_config?: MetricScheduleData;
  cron_expression?: string;
  created_at: string;
  updated_at: string;
  client_id?: string;
}

export interface MetricLog {
  id: string;
  value: number;
  date: string;
  created_at: string;
}

export interface ClientMetric {
  id: string;
  assignment_id: string;
  name: string;
  unit: string;
  description?: string;
  value_kind: MetricValueKind;
  schedule_config?: MetricScheduleData;
  cron_expression?: string;
  logs?: MetricLog[];
}

// =============================================================================
// Operation Types - Create/Update
// =============================================================================

export interface CreateMetricInput {
  name: string;
  unit?: string;
  description?: string;
  value_kind?: MetricValueKind;
  min_value?: number;
  max_value?: number;
  schedule_config?: MetricScheduleData;
  cron_expression?: string;
  client_id?: string;
}

export interface AssignMetricData {
  metricIds?: string[];
  clientId: string;
  coachId: string;
  name?: string;
  unit?: string;
  description?: string;
  value_kind?: MetricValueKind;
  schedule_config?: MetricScheduleData;
  cron_expression?: string;
}

export interface AssignMetricsToClientsData {
  metricIds: string[];
  clientIds: string[];
  coachId: string;
  schedule_config?: MetricScheduleData;
  cron_expression?: string;
}

export interface RemoveMetricData {
  metricIds: string[];
  clientId: string;
  coachId: string;
}

export interface LogMetricData {
  assignmentId: string;
  value: number;
  date: Date;
  clientId: string;
  coachId: string;
}

export interface UpdateMetricData {
  assignmentId: string;
  name?: string;
  unit?: string;
  description?: string;
  value_kind?: MetricValueKind;
  min_value?: number;
  max_value?: number;
  schedule_config?: MetricScheduleData;
  cron_expression?: string;
  clientId: string;
  coachId: string;
}

export interface UpdateMetricLogData {
  logId: string;
  value?: number;
  date?: Date;
  clientId: string;
  coachId: string;
}

// =============================================================================
// Default Metric Templates
// =============================================================================

export interface DefaultMetric {
  name: string;
  unit: string;
  schedule?: MetricScheduleData;
}

export interface MetricSection {
  label: string;
  metrics: DefaultMetric[];
}
