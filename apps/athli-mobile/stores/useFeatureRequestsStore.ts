import { create } from 'zustand';
import type {
  FeatureRequest,
  FeatureRequestReply,
  SortOption,
} from '@/types/feature-requests';

interface FeatureRequestsStore {
  // List state
  requests: FeatureRequest[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  page: number;
  sortBy: SortOption;
  searchQuery: string;

  // Detail state
  currentRequest: FeatureRequest | null;
  replies: FeatureRequestReply[];
  isLoadingReplies: boolean;

  // List actions
  setRequests: (requests: FeatureRequest[]) => void;
  appendRequests: (requests: FeatureRequest[], hasMore: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsLoadingMore: (isLoadingMore: boolean) => void;
  setSortBy: (sortBy: SortOption) => void;
  setSearchQuery: (searchQuery: string) => void;
  resetPagination: () => void;
  incrementPage: () => void;

  // Request manipulation
  addRequest: (request: FeatureRequest) => void;
  removeRequest: (requestId: string) => void;
  updateRequestUpvote: (
    requestId: string,
    hasUpvoted: boolean,
    newCount: number
  ) => void;

  // Detail actions
  setCurrentRequest: (request: FeatureRequest | null) => void;
  setReplies: (replies: FeatureRequestReply[]) => void;
  setIsLoadingReplies: (isLoading: boolean) => void;
  addReply: (reply: FeatureRequestReply) => void;
  removeReply: (replyId: string) => void;
  incrementReplyCount: (requestId: string) => void;
  decrementReplyCount: (requestId: string) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  requests: [],
  isLoading: false,
  isLoadingMore: false,
  hasMore: true,
  page: 0,
  sortBy: 'newest' as SortOption,
  searchQuery: '',
  currentRequest: null,
  replies: [],
  isLoadingReplies: false,
};

export const useFeatureRequestsStore = create<FeatureRequestsStore>(
  (set, get) => ({
    ...initialState,

    // List actions
    setRequests: (requests) => set({ requests, hasMore: requests.length >= 20 }),

    appendRequests: (newRequests, hasMore) =>
      set((state) => ({
        requests: [...state.requests, ...newRequests],
        hasMore,
      })),

    setIsLoading: (isLoading) => set({ isLoading }),

    setIsLoadingMore: (isLoadingMore) => set({ isLoadingMore }),

    setSortBy: (sortBy) => set({ sortBy, page: 0, requests: [], hasMore: true }),

    setSearchQuery: (searchQuery) =>
      set({ searchQuery, page: 0, requests: [], hasMore: true }),

    resetPagination: () => set({ page: 0, requests: [], hasMore: true }),

    incrementPage: () => set((state) => ({ page: state.page + 1 })),

    // Request manipulation
    addRequest: (request) =>
      set((state) => {
        // Add to the beginning if sorting by newest
        if (state.sortBy === 'newest') {
          return { requests: [request, ...state.requests] };
        }
        // For other sorts, just append (will be re-sorted on next fetch)
        return { requests: [...state.requests, request] };
      }),

    removeRequest: (requestId) =>
      set((state) => ({
        requests: state.requests.filter((r) => r.id !== requestId),
        currentRequest:
          state.currentRequest?.id === requestId ? null : state.currentRequest,
      })),

    updateRequestUpvote: (requestId, hasUpvoted, newCount) =>
      set((state) => ({
        requests: state.requests.map((r) =>
          r.id === requestId
            ? { ...r, hasUpvoted, upvoteCount: newCount }
            : r
        ),
        currentRequest:
          state.currentRequest?.id === requestId
            ? { ...state.currentRequest, hasUpvoted, upvoteCount: newCount }
            : state.currentRequest,
      })),

    // Detail actions
    setCurrentRequest: (currentRequest) => set({ currentRequest }),

    setReplies: (replies) => set({ replies }),

    setIsLoadingReplies: (isLoadingReplies) => set({ isLoadingReplies }),

    addReply: (reply) =>
      set((state) => ({
        replies: [...state.replies, reply],
      })),

    removeReply: (replyId) =>
      set((state) => ({
        replies: state.replies.filter((r) => r.id !== replyId),
      })),

    incrementReplyCount: (requestId) =>
      set((state) => ({
        requests: state.requests.map((r) =>
          r.id === requestId ? { ...r, replyCount: r.replyCount + 1 } : r
        ),
        currentRequest:
          state.currentRequest?.id === requestId
            ? { ...state.currentRequest, replyCount: state.currentRequest.replyCount + 1 }
            : state.currentRequest,
      })),

    decrementReplyCount: (requestId) =>
      set((state) => ({
        requests: state.requests.map((r) =>
          r.id === requestId ? { ...r, replyCount: Math.max(0, r.replyCount - 1) } : r
        ),
        currentRequest:
          state.currentRequest?.id === requestId
            ? {
                ...state.currentRequest,
                replyCount: Math.max(0, state.currentRequest.replyCount - 1),
              }
            : state.currentRequest,
      })),

    // Reset
    reset: () => set(initialState),
  })
);
