import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { globalSearch, type SearchResults, type ClientAssignmentResult } from '@/api/settings/search/search-service';

export type SearchCategory =
  | 'athletes'
  | 'workouts'
  | 'programs'
  | 'exercises'
  | 'sections'
  | 'checkIns'
  | 'questionnaires'
  | 'files'
  | 'habits'
  | 'metrics'
  | 'flows'
  | 'todos'
  | 'messages'
  | 'clientSection';

export interface SearchResultItem {
  id: string;
  name: string;
  subtitle?: string;
  path: string;
  avatarUrl?: string;
}

export interface CategoryResults {
  key: SearchCategory;
  label: string;
  items: SearchResultItem[];
  sectionPath: string;
  avatarUrl?: string;
}

function transformResults(data: SearchResults): CategoryResults[] {
  const categories: CategoryResults[] = [];

  // 1. Athletes
  if (data.athletes?.length > 0) {
    categories.push({
      key: 'athletes',
      label: 'sidebar.search.athletes',
      items: data.athletes.map((a: any) => ({
        id: a.client_id,
        name: a.name || 'Unknown',
        subtitle: a.email,
        path: `/athletes/${a.client_id}`,
        avatarUrl: a.profile_picture_url,
      })),
      sectionPath: '/athletes',
    });
  }

  // 2. Workouts
  if (data.workouts?.length > 0) {
    categories.push({
      key: 'workouts',
      label: 'sidebar.search.workouts',
      items: data.workouts.map((w: any) => ({
        id: w.id,
        name: w.name,
        subtitle: [w.type, w.equipment].filter(Boolean).join(' \u2022 '),
        path: `/training/workouts/${w.id}/edit`,
      })),
      sectionPath: '/training/workouts',
    });
  }

  // 3. Programs
  if (data.programs?.length > 0) {
    categories.push({
      key: 'programs',
      label: 'sidebar.search.programs',
      items: data.programs.map((p: any) => ({
        id: p.id,
        name: p.program || p.name,
        subtitle: p.description,
        path: `/training/programs/${p.id}/edit`,
      })),
      sectionPath: '/training/programs',
    });
  }

  // 4. Exercises
  if (data.exercises?.length > 0) {
    categories.push({
      key: 'exercises',
      label: 'sidebar.search.exercises',
      items: data.exercises.map((e: any) => ({
        id: e.id,
        name: e.name,
        subtitle: e.category,
        path: `/training/exercises?exerciseId=${e.id}`,
      })),
      sectionPath: '/training/exercises',
    });
  }

  // 5. Sections
  if (data.sections?.length > 0) {
    categories.push({
      key: 'sections',
      label: 'sidebar.search.sections',
      items: data.sections.map((s: any) => ({
        id: s.id,
        name: s.name,
        subtitle: s.section_type,
        path: `/training/sections?sectionId=${s.id}`,
      })),
      sectionPath: '/training/sections',
    });
  }

  // 6. Coach Check-ins
  if (data.coachCheckIns?.length > 0) {
    categories.push({
      key: 'checkIns',
      label: 'sidebar.search.checkIns',
      items: data.coachCheckIns.map((c: any) => ({
        id: c.id,
        name: c.name,
        subtitle: c.description,
        path: `/forms/check-ins/${c.id}`,
      })),
      sectionPath: '/forms/check-ins',
    });
  }

  // 7. Coach Questionnaires
  if (data.coachQuestionnaires?.length > 0) {
    categories.push({
      key: 'questionnaires',
      label: 'sidebar.search.questionnaires',
      items: data.coachQuestionnaires.map((q: any) => ({
        id: q.id,
        name: q.name,
        subtitle: q.description,
        path: `/forms/questionnaires/${q.id}`,
      })),
      sectionPath: '/forms/questionnaires',
    });
  }

  // 8. Coach Files
  if (data.files?.length > 0) {
    categories.push({
      key: 'files',
      label: 'sidebar.search.files',
      items: data.files.map((f: any) => ({
        id: f.id,
        name: f.filename,
        subtitle: undefined,
        path: '/library/files',
      })),
      sectionPath: '/library/files',
    });
  }

  // 9. Coach Habits
  if (data.habits?.length > 0) {
    categories.push({
      key: 'habits',
      label: 'sidebar.search.habits',
      items: data.habits.map((h: any) => ({
        id: h.id,
        name: h.name,
        subtitle: h.description,
        path: '/library/habits',
      })),
      sectionPath: '/library/habits',
    });
  }

  // 10. Coach Metrics
  if (data.metrics?.length > 0) {
    categories.push({
      key: 'metrics',
      label: 'sidebar.search.metrics',
      items: data.metrics.map((m: any) => ({
        id: m.id,
        name: m.name,
        subtitle: m.unit ? `Unit: ${m.unit}` : m.description,
        path: '/library/metrics',
      })),
      sectionPath: '/library/metrics',
    });
  }

  // 11. Flows
  if (data.flows?.length > 0) {
    categories.push({
      key: 'flows',
      label: 'sidebar.search.flows',
      items: data.flows.map((f: any) => ({
        id: f.id,
        name: f.name || 'Untitled Flow',
        subtitle: f.description,
        path: `/flows/${f.id}`,
      })),
      sectionPath: '/flows',
    });
  }

  // 12. To-do's (combine own + auto)
  const ownTodos = (data.todosYourList || []).map((t: any) => ({
    id: t.id,
    name: t.title,
    subtitle: t.information,
    path: '/todo/your-list',
  }));
  const autoTodos = (data.todosAthliAssistant || []).map((t: any) => ({
    id: t.id,
    name: t.title,
    subtitle: undefined,
    path: '/todo/athli-assistant',
  }));
  const allTodos = [...ownTodos, ...autoTodos];
  if (allTodos.length > 0) {
    categories.push({
      key: 'todos',
      label: 'sidebar.search.todos',
      items: allTodos,
      sectionPath: '/todo/your-list',
    });
  }

  // 13. Messages
  if (data.conversations?.length > 0) {
    categories.push({
      key: 'messages',
      label: 'sidebar.search.conversations',
      items: data.conversations.map((c: any) => ({
        id: c.id,
        name: c.client?.name || 'Unknown',
        subtitle: c.last_message_preview || undefined,
        path: `/inbox?conversationId=${c.id}`,
      })),
      sectionPath: '/inbox',
    });
  }

  // 14. Client-specific items grouped by client
  const clientItemsByClient = new Map<string, { clientName: string; clientId: string; avatarUrl: string; items: SearchResultItem[] }>();

  const addClientItems = (items: ClientAssignmentResult[], typeSuffix: string, pathSegment: string) => {
    for (const item of items) {
      if (!item.client_id || !item.name) continue;
      let bucket = clientItemsByClient.get(item.client_id);
      if (!bucket) {
        bucket = { clientName: item.client_name || 'Unknown', clientId: item.client_id, avatarUrl: item.avatar_url || '', items: [] };
        clientItemsByClient.set(item.client_id, bucket);
      }
      bucket.items.push({
        id: item.id,
        name: item.name,
        subtitle: typeSuffix,
        path: `/athletes/${item.client_id}/${pathSegment}`,
      });
    }
  };

  addClientItems(data.clientHabits || [], 'Habit', 'habits');
  addClientItems(data.clientMetrics || [], 'Metric', 'metrics');
  addClientItems(data.clientFiles || [], 'File', 'files');
  addClientItems(data.clientCheckIns || [], 'Check-in', 'check-ins');
  addClientItems(data.clientQuestionnaires || [], 'Questionnaire', 'questionnaires');

  for (const [clientId, bucket] of clientItemsByClient) {
    categories.push({
      key: 'clientSection',
      label: bucket.clientName,
      items: bucket.items,
      sectionPath: `/athletes/${clientId}`,
      avatarUrl: bucket.avatarUrl,
    });
  }

  return categories;
}

export function useGlobalSearch(query: string) {
  const trimmed = query.trim();

  const { data, isLoading } = useQuery({
    queryKey: ['globalSearch', trimmed],
    queryFn: () => globalSearch(trimmed),
    enabled: trimmed.length > 0,
    staleTime: 30_000,
  });

  const results = useMemo(() => {
    if (!data) return [];
    return transformResults(data);
  }, [data]);

  const hasResults = results.length > 0;
  const totalCount = results.reduce((sum, cat) => sum + cat.items.length, 0);

  return { results, hasResults, totalCount, isLoading: trimmed.length > 0 && isLoading };
}
