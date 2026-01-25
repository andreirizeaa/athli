import { supabase } from '@/lib/supabase';
import type {
  FeatureRequest,
  FeatureRequestReply,
  SortOption,
  CreateFeatureRequestData,
  CreateReplyData,
  UserType,
} from '@/types/feature-requests';

const PAGE_SIZE = 20;

interface UserInfo {
  userId: string;
  userName: string;
  userType: UserType;
  profilePictureUrl: string | null;
}

/**
 * Get paginated list of feature requests
 */
export async function getFeatureRequests(
  page: number,
  sortBy: SortOption,
  searchQuery: string,
  currentUserId: string
): Promise<{ data: FeatureRequest[]; hasMore: boolean }> {
  const offset = page * PAGE_SIZE;

  let query = supabase
    .from('feature_requests')
    .select('*');

  // Apply search filter (fuzzy search with wildcards)
  if (searchQuery.trim()) {
    const searchTerms = searchQuery.trim().toLowerCase().split(/\s+/);
    // Create fuzzy search pattern for each term
    const patterns = searchTerms.map(term => `%${term}%`).join('%');
    query = query.or(`title.ilike.${patterns},description.ilike.${patterns},user_name.ilike.${patterns}`);
  }

  // Apply 'yours' filter
  if (sortBy === 'yours') {
    query = query.eq('user_id', currentUserId);
  }

  // Apply sorting
  switch (sortBy) {
    case 'newest':
    case 'yours':
      query = query.order('created_at', { ascending: false });
      break;
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'popular':
      query = query.order('upvote_count', { ascending: false });
      break;
  }

  // Apply pagination
  query = query.range(offset, offset + PAGE_SIZE - 1);

  // Execute main query
  const { data: requests, error: requestsError } = await query;

  if (requestsError) {
    throw new Error(requestsError.message);
  }

  // Get upvotes for current user to check hasUpvoted
  const requestIds = (requests || []).map((r: any) => r.id);
  const { data: userUpvotes } = await supabase
    .from('feature_request_upvotes')
    .select('feature_request_id')
    .eq('user_id', currentUserId)
    .in('feature_request_id', requestIds);

  const upvotedIds = new Set((userUpvotes || []).map((u) => u.feature_request_id));

  // Get reply counts
  const { data: replyCounts } = await supabase
    .from('feature_request_replies')
    .select('feature_request_id')
    .in('feature_request_id', requestIds);

  const replyCountMap = new Map<string, number>();
  (replyCounts || []).forEach((r) => {
    const count = replyCountMap.get(r.feature_request_id) || 0;
    replyCountMap.set(r.feature_request_id, count + 1);
  });

  const mappedData: FeatureRequest[] = (requests || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    upvoteCount: r.upvote_count,
    userId: r.user_id,
    userName: r.user_name,
    userType: r.user_type as UserType,
    profilePictureUrl: r.profile_picture_url,
    status: r.status,
    createdAt: r.created_at,
    replyCount: replyCountMap.get(r.id) || 0,
    hasUpvoted: upvotedIds.has(r.id),
  }));

  return {
    data: mappedData,
    hasMore: mappedData.length === PAGE_SIZE,
  };
}

/**
 * Get a single feature request by ID
 */
export async function getFeatureRequestById(
  id: string,
  currentUserId: string
): Promise<FeatureRequest | null> {
  const { data, error } = await supabase
    .from('feature_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(error.message);
  }

  // Check if user has upvoted
  const { data: upvote } = await supabase
    .from('feature_request_upvotes')
    .select('id')
    .eq('feature_request_id', id)
    .eq('user_id', currentUserId)
    .maybeSingle();

  // Get reply count
  const { count } = await supabase
    .from('feature_request_replies')
    .select('*', { count: 'exact', head: true })
    .eq('feature_request_id', id);

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    upvoteCount: data.upvote_count,
    userId: data.user_id,
    userName: data.user_name,
    userType: data.user_type as UserType,
    profilePictureUrl: data.profile_picture_url,
    status: data.status,
    createdAt: data.created_at,
    replyCount: count || 0,
    hasUpvoted: !!upvote,
  };
}

/**
 * Create a new feature request
 */
export async function createFeatureRequest(
  requestData: CreateFeatureRequestData,
  user: UserInfo
): Promise<FeatureRequest> {
  // Insert feature request (upvote_count starts at 0, trigger will increment when we add the upvote)
  const { data, error } = await supabase
    .from('feature_requests')
    .insert({
      title: requestData.title,
      description: requestData.description || null,
      user_id: user.userId,
      user_name: user.userName,
      user_type: user.userType,
      profile_picture_url: user.profilePictureUrl,
      upvote_count: 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Auto-upvote by the creator
  await supabase.from('feature_request_upvotes').insert({
    feature_request_id: data.id,
    user_id: user.userId,
  });

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    upvoteCount: 1, // Will be 1 after trigger increments from auto-upvote
    userId: data.user_id,
    userName: data.user_name,
    userType: data.user_type as UserType,
    profilePictureUrl: data.profile_picture_url,
    status: data.status,
    createdAt: data.created_at,
    replyCount: 0,
    hasUpvoted: true,
  };
}

/**
 * Delete a feature request (only if status is null and user is owner)
 */
export async function deleteFeatureRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from('feature_requests')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Toggle upvote on a feature request
 * Returns the new upvote state
 */
export async function toggleUpvote(
  featureRequestId: string,
  userId: string
): Promise<{ hasUpvoted: boolean; newCount: number }> {
  // Check if user has already upvoted
  const { data: existingUpvote } = await supabase
    .from('feature_request_upvotes')
    .select('id')
    .eq('feature_request_id', featureRequestId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingUpvote) {
    // Remove upvote
    await supabase
      .from('feature_request_upvotes')
      .delete()
      .eq('feature_request_id', featureRequestId)
      .eq('user_id', userId);

    // Get updated count
    const { data } = await supabase
      .from('feature_requests')
      .select('upvote_count')
      .eq('id', featureRequestId)
      .single();

    return { hasUpvoted: false, newCount: data?.upvote_count || 0 };
  } else {
    // Add upvote
    await supabase.from('feature_request_upvotes').insert({
      feature_request_id: featureRequestId,
      user_id: userId,
    });

    // Get updated count
    const { data } = await supabase
      .from('feature_requests')
      .select('upvote_count')
      .eq('id', featureRequestId)
      .single();

    return { hasUpvoted: true, newCount: data?.upvote_count || 0 };
  }
}

/**
 * Get replies for a feature request
 */
export async function getReplies(
  featureRequestId: string
): Promise<FeatureRequestReply[]> {
  const { data, error } = await supabase
    .from('feature_request_replies')
    .select('*')
    .eq('feature_request_id', featureRequestId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((r) => ({
    id: r.id,
    featureRequestId: r.feature_request_id,
    userId: r.user_id,
    userName: r.user_name,
    userType: r.user_type as UserType,
    profilePictureUrl: r.profile_picture_url,
    message: r.message,
    createdAt: r.created_at,
  }));
}

/**
 * Create a reply to a feature request
 */
export async function createReply(
  replyData: CreateReplyData,
  user: UserInfo
): Promise<FeatureRequestReply> {
  const { data, error } = await supabase
    .from('feature_request_replies')
    .insert({
      feature_request_id: replyData.featureRequestId,
      user_id: user.userId,
      user_name: user.userName,
      user_type: user.userType,
      profile_picture_url: user.profilePictureUrl,
      message: replyData.message,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data.id,
    featureRequestId: data.feature_request_id,
    userId: data.user_id,
    userName: data.user_name,
    userType: data.user_type as UserType,
    profilePictureUrl: data.profile_picture_url,
    message: data.message,
    createdAt: data.created_at,
  };
}

/**
 * Delete a reply (only owner can delete)
 */
export async function deleteReply(replyId: string): Promise<void> {
  const { error } = await supabase
    .from('feature_request_replies')
    .delete()
    .eq('id', replyId);

  if (error) {
    throw new Error(error.message);
  }
}
