import api from '@/lib/axios';

export type ClientAssignmentResult = {
    id: string;
    client_id: string;
    name: string;
    description?: string;
    unit?: string;
    client_name: string;
    avatar_url?: string;
};

export type SearchResults = {
    metrics: any[];
    habits: any[];
    files: any[];
    workouts: any[];
    programs: any[];
    exercises: any[];
    sections: any[];
    todosYourList: any[];
    todosAthliAssistant: any[];
    conversations: any[];
    athletes: any[];
    coachCheckIns: any[];
    coachQuestionnaires: any[];
    flows: any[];
    clientHabits: ClientAssignmentResult[];
    clientMetrics: ClientAssignmentResult[];
    clientFiles: ClientAssignmentResult[];
    clientCheckIns: ClientAssignmentResult[];
    clientQuestionnaires: ClientAssignmentResult[];
};

export const globalSearch = async (query: string): Promise<SearchResults> => {
    const { data } = await api.get<{ data: SearchResults }>('/search', { params: { q: query } });
    return data.data;
};
