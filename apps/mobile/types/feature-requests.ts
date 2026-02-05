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
