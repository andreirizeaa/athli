import { Request, Response } from 'express';
import { success, unauthorized, created, internalError, notFound, badRequest } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

const PAGE_SIZE = 20;

type UserType = 'coach' | 'client';

interface FeatureRequest {
  id: string;
  title: string;
  description: string | null;
  upvoteCount: number;
  userId: string;
  userName: string;
  userType: UserType;
  profilePictureUrl: string | null;
  status: string | null;
  createdAt: string;
  replyCount: number;
  hasUpvoted: boolean;
}

interface FeatureRequestReply {
  id: string;
  featureRequestId: string;
  userId: string;
  userName: string;
  userType: UserType;
  profilePictureUrl: string | null;
  message: string;
  createdAt: string;
}

export const featureRequestsController = {
  /**
   * Get paginated list of feature requests
   */
  getFeatureRequests: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const { page = 0, sortBy = 'newest', searchQuery = '' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const offset = pageNum * PAGE_SIZE;

    const supabase = getSupabaseClient();

    try {
      let query = supabase
        .from('feature_requests')
        .select('*');

      // Apply search filter
      if (searchQuery && (searchQuery as string).trim()) {
        const searchTerms = (searchQuery as string).trim().toLowerCase().split(/\s+/);
        const patterns = searchTerms.map(term => `%${term}%`).join('%');
        query = query.or(`title.ilike.${patterns},description.ilike.${patterns},user_name.ilike.${patterns}`);
      }

      // Apply 'yours' filter
      if (sortBy === 'yours') {
        query = query.eq('user_id', userId);
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

      const { data: requests, error: requestsError } = await query;

      if (requestsError) {
        return internalError(res, { message: requestsError.message });
      }

      // Get upvotes for current user
      const requestIds = (requests || []).map((r: any) => r.id);
      const { data: userUpvotes } = await supabase
        .from('feature_request_upvotes')
        .select('feature_request_id')
        .eq('user_id', userId)
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

      success(res, {
        message: 'Feature requests retrieved successfully',
        data: {
          requests: mappedData,
          hasMore: mappedData.length === PAGE_SIZE,
        },
      });
    } catch (error: any) {
      return internalError(res, { message: error.message });
    }
  },

  /**
   * Get a single feature request by ID
   */
  getFeatureRequestById: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('feature_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return notFound(res, { message: 'Feature request not found' });
        }
        return internalError(res, { message: error.message });
      }

      // Check if user has upvoted
      const { data: upvote } = await supabase
        .from('feature_request_upvotes')
        .select('id')
        .eq('feature_request_id', id)
        .eq('user_id', userId)
        .maybeSingle();

      // Get reply count
      const { count } = await supabase
        .from('feature_request_replies')
        .select('*', { count: 'exact', head: true })
        .eq('feature_request_id', id);

      const featureRequest: FeatureRequest = {
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

      success(res, {
        message: 'Feature request retrieved successfully',
        data: { featureRequest },
      });
    } catch (error: any) {
      return internalError(res, { message: error.message });
    }
  },

  /**
   * Create a new feature request
   */
  createFeatureRequest: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { title, description, userName, userType, profilePictureUrl } = req.body;

    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    if (!title) {
      return badRequest(res, { message: 'Title is required' });
    }

    if (!userName || !userType) {
      return badRequest(res, { message: 'User info is required' });
    }

    const supabase = getSupabaseClient();

    try {
      // Insert feature request
      const { data, error } = await supabase
        .from('feature_requests')
        .insert({
          title,
          description: description || null,
          user_id: userId,
          user_name: userName,
          user_type: userType,
          profile_picture_url: profilePictureUrl || null,
          upvote_count: 0,
        })
        .select()
        .single();

      if (error) {
        return internalError(res, { message: error.message });
      }

      // Auto-upvote by the creator
      await supabase.from('feature_request_upvotes').insert({
        feature_request_id: data.id,
        user_id: userId,
      });

      const featureRequest: FeatureRequest = {
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

      created(res, {
        message: 'Feature request created successfully',
        data: { featureRequest },
      });
    } catch (error: any) {
      return internalError(res, { message: error.message });
    }
  },

  /**
   * Delete a feature request (only if status is null and user is owner)
   */
  deleteFeatureRequest: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();

    try {
      // Check ownership and status before deleting
      const { data: existing, error: fetchError } = await supabase
        .from('feature_requests')
        .select('user_id, status')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        return notFound(res, { message: 'Feature request not found' });
      }

      if (existing.user_id !== userId) {
        return unauthorized(res, { message: 'Not authorized to delete this request' });
      }

      if (existing.status !== null) {
        return badRequest(res, { message: 'Cannot delete a request that is in progress or completed' });
      }

      const { error } = await supabase
        .from('feature_requests')
        .delete()
        .eq('id', id);

      if (error) {
        return internalError(res, { message: error.message });
      }

      success(res, { message: 'Feature request deleted successfully' });
    } catch (error: any) {
      return internalError(res, { message: error.message });
    }
  },

  /**
   * Toggle upvote on a feature request
   */
  toggleUpvote: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();

    try {
      // Check if user has already upvoted
      const { data: existingUpvote } = await supabase
        .from('feature_request_upvotes')
        .select('id')
        .eq('feature_request_id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingUpvote) {
        // Remove upvote
        await supabase
          .from('feature_request_upvotes')
          .delete()
          .eq('feature_request_id', id)
          .eq('user_id', userId);

        // Get updated count
        const { data } = await supabase
          .from('feature_requests')
          .select('upvote_count')
          .eq('id', id)
          .single();

        success(res, {
          message: 'Upvote removed',
          data: { hasUpvoted: false, newCount: data?.upvote_count || 0 },
        });
      } else {
        // Add upvote
        await supabase.from('feature_request_upvotes').insert({
          feature_request_id: id,
          user_id: userId,
        });

        // Get updated count
        const { data } = await supabase
          .from('feature_requests')
          .select('upvote_count')
          .eq('id', id)
          .single();

        success(res, {
          message: 'Upvote added',
          data: { hasUpvoted: true, newCount: data?.upvote_count || 0 },
        });
      }
    } catch (error: any) {
      return internalError(res, { message: error.message });
    }
  },

  /**
   * Get replies for a feature request
   */
  getReplies: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('feature_request_replies')
        .select('*')
        .eq('feature_request_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        return internalError(res, { message: error.message });
      }

      const replies: FeatureRequestReply[] = (data || []).map((r) => ({
        id: r.id,
        featureRequestId: r.feature_request_id,
        userId: r.user_id,
        userName: r.user_name,
        userType: r.user_type as UserType,
        profilePictureUrl: r.profile_picture_url,
        message: r.message,
        createdAt: r.created_at,
      }));

      success(res, {
        message: 'Replies retrieved successfully',
        data: { replies },
      });
    } catch (error: any) {
      return internalError(res, { message: error.message });
    }
  },

  /**
   * Create a reply to a feature request
   */
  createReply: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { message, userName, userType, profilePictureUrl } = req.body;

    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    if (!message) {
      return badRequest(res, { message: 'Message is required' });
    }

    if (!userName || !userType) {
      return badRequest(res, { message: 'User info is required' });
    }

    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('feature_request_replies')
        .insert({
          feature_request_id: id,
          user_id: userId,
          user_name: userName,
          user_type: userType,
          profile_picture_url: profilePictureUrl || null,
          message,
        })
        .select()
        .single();

      if (error) {
        return internalError(res, { message: error.message });
      }

      const reply: FeatureRequestReply = {
        id: data.id,
        featureRequestId: data.feature_request_id,
        userId: data.user_id,
        userName: data.user_name,
        userType: data.user_type as UserType,
        profilePictureUrl: data.profile_picture_url,
        message: data.message,
        createdAt: data.created_at,
      };

      created(res, {
        message: 'Reply created successfully',
        data: { reply },
      });
    } catch (error: any) {
      return internalError(res, { message: error.message });
    }
  },

  /**
   * Delete a reply (only owner can delete)
   */
  deleteReply: async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { replyId } = req.params;

    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();

    try {
      // Check ownership before deleting
      const { data: existing, error: fetchError } = await supabase
        .from('feature_request_replies')
        .select('user_id')
        .eq('id', replyId)
        .single();

      if (fetchError || !existing) {
        return notFound(res, { message: 'Reply not found' });
      }

      if (existing.user_id !== userId) {
        return unauthorized(res, { message: 'Not authorized to delete this reply' });
      }

      const { error } = await supabase
        .from('feature_request_replies')
        .delete()
        .eq('id', replyId);

      if (error) {
        return internalError(res, { message: error.message });
      }

      success(res, { message: 'Reply deleted successfully' });
    } catch (error: any) {
      return internalError(res, { message: error.message });
    }
  },
};
