/**
 * Todo/Task Types
 *
 * Shared types for todos and tasks used across web and mobile apps.
 */

// =============================================================================
// Core Task Types
// =============================================================================

export type TaskType = 'client' | 'general';

export interface YourListTask {
  id: string;
  title: string;
  information?: string;
  type: TaskType;
  clientId?: string;
  clientName?: string;
  clientAvatar?: string;
  dueDate?: string;
  completed: boolean;
}

export interface AthliAssistantTask {
  id: string;
  title: string;
  type: TaskType;
  clientName?: string;
  clientAvatar?: string;
  completed: boolean;
}

// =============================================================================
// Operation Types
// =============================================================================

export interface CreateTaskData {
  title: string;
  information?: string;
  type: TaskType;
  client_id?: string;
  due_date?: string;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  completed?: boolean;
}
