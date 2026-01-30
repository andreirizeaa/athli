import api from '@/lib/axios';

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
};

export const globalSearch = async (query: string): Promise<SearchResults> => {
    const { data } = await api.get<{ data: SearchResults }>('/search', { params: { q: query } });
    return data.data;
};
