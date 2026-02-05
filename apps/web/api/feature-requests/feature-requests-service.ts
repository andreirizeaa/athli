import { apiFetch } from '@/api/api-client';

export type FeatureRequestStatus = null | 'in_progress' | 'completed';
export type UserType = 'coach' | 'client';
export type SortOption = 'newest' | 'oldest' | 'popular' | 'yours';

export interface FeatureRequest {
  id: string;
  title: string;
  description: string | null;
  upvoteCount: number;
  userId: string;
  userName: string;
  userType: UserType;
  profilePictureUrl: string | null;
  status: FeatureRequestStatus;
  createdAt: string;
  replyCount: number;
  hasUpvoted: boolean;
}

export interface FeatureRequestReply {
  id: string;
  featureRequestId: string;
  userId: string;
  userName: string;
  userType: UserType;
  profilePictureUrl: string | null;
  message: string;
  createdAt: string;
}

export interface CreateFeatureRequestData {
  title: string;
  description?: string;
}

export interface CreateReplyData {
  featureRequestId: string;
  message: string;
}

export interface UserInfo {
  userName: string;
  userType: UserType;
  profilePictureUrl: string | null;
}

interface GetFeatureRequestsResponse {
  data: {
    requests: FeatureRequest[];
    hasMore: boolean;
  };
}

interface GetFeatureRequestByIdResponse {
  data: {
    featureRequest: FeatureRequest;
  };
}

interface CreateFeatureRequestResponse {
  data: {
    featureRequest: FeatureRequest;
  };
}

interface ToggleUpvoteResponse {
  data: {
    hasUpvoted: boolean;
    newCount: number;
  };
}

interface GetRepliesResponse {
  data: {
    replies: FeatureRequestReply[];
  };
}

interface CreateReplyResponse {
  data: {
    reply: FeatureRequestReply;
  };
}

/**
 * Get paginated list of feature requests
 */
export async function getFeatureRequests(
  page: number = 0,
  sortBy: SortOption = 'newest',
  searchQuery: string = ''
): Promise<{ requests: FeatureRequest[]; hasMore: boolean }> {
  const response = await apiFetch<GetFeatureRequestsResponse>(
    '/feature-requests',
    {
      params: {
        page,
        sortBy,
        searchQuery,
      },
    }
  );

  return {
    requests: response.data.requests,
    hasMore: response.data.hasMore,
  };
}

/**
 * Get a single feature request by ID
 */
export async function getFeatureRequestById(
  id: string
): Promise<FeatureRequest | null> {
  try {
    const response = await apiFetch<GetFeatureRequestByIdResponse>(
      `/feature-requests/${id}`
    );

    return response.data.featureRequest;
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return null;
    }
    throw error;
  }
}

/**
 * Create a new feature request
 */
export async function createFeatureRequest(
  requestData: CreateFeatureRequestData,
  user: UserInfo
): Promise<FeatureRequest> {
  const response = await apiFetch<CreateFeatureRequestResponse>(
    '/feature-requests',
    {
      method: 'POST',
      body: {
        title: requestData.title,
        description: requestData.description,
        userName: user.userName,
        userType: user.userType,
        profilePictureUrl: user.profilePictureUrl,
      },
    }
  );

  return response.data.featureRequest;
}

/**
 * Delete a feature request (only if status is null and user is owner)
 */
export async function deleteFeatureRequest(id: string): Promise<void> {
  await apiFetch(`/feature-requests/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Toggle upvote on a feature request
 */
export async function toggleUpvote(
  featureRequestId: string
): Promise<{ hasUpvoted: boolean; newCount: number }> {
  const response = await apiFetch<ToggleUpvoteResponse>(
    `/feature-requests/${featureRequestId}/upvote`,
    {
      method: 'POST',
    }
  );

  return {
    hasUpvoted: response.data.hasUpvoted,
    newCount: response.data.newCount,
  };
}

/**
 * Get replies for a feature request
 */
export async function getReplies(
  featureRequestId: string
): Promise<FeatureRequestReply[]> {
  const response = await apiFetch<GetRepliesResponse>(
    `/feature-requests/${featureRequestId}/replies`
  );

  return response.data.replies;
}

/**
 * Create a reply to a feature request
 */
export async function createReply(
  replyData: CreateReplyData,
  user: UserInfo
): Promise<FeatureRequestReply> {
  const response = await apiFetch<CreateReplyResponse>(
    `/feature-requests/${replyData.featureRequestId}/replies`,
    {
      method: 'POST',
      body: {
        message: replyData.message,
        userName: user.userName,
        userType: user.userType,
        profilePictureUrl: user.profilePictureUrl,
      },
    }
  );

  return response.data.reply;
}

/**
 * Delete a reply (only owner can delete)
 */
export async function deleteReply(replyId: string): Promise<void> {
  await apiFetch(`/feature-requests/replies/${replyId}`, {
    method: 'DELETE',
  });
}
