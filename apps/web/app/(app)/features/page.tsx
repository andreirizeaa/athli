'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Plus, ChevronUp, MessageCircle, User, Trash2, ArrowUpDown, Loader2, ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/general/utils';
import { useGlobalData } from '@/providers/global-data-provider';
import {
  getFeatureRequests,
  getFeatureRequestById,
  getReplies,
  toggleUpvote,
  deleteFeatureRequest,
  deleteReply,
  type FeatureRequest,
  type FeatureRequestReply,
  type SortOption,
} from '@/api/feature-requests/feature-requests-service';
import { AddFeatureRequestDialog } from './components/add-feature-request-dialog';
import { AddReplyDialog } from './components/add-reply-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const FILTER_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Popular', value: 'popular' },
  { label: 'Yours', value: 'yours' },
];

export default function FeaturesPage() {
  const t = useTranslations();
  const { user } = useGlobalData();
  const isMobile = useIsMobile();

  // State
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<FeatureRequest | null>(null);
  const [replies, setReplies] = useState<FeatureRequestReply[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [sortRepliesAscending, setSortRepliesAscending] = useState(false);

  // Dialog states
  const [isAddRequestOpen, setIsAddRequestOpen] = useState(false);
  const [isAddReplyOpen, setIsAddReplyOpen] = useState(false);
  const [deleteRequestId, setDeleteRequestId] = useState<string | null>(null);
  const [deleteReplyId, setDeleteReplyId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load feature requests
  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getFeatureRequests(0, sortBy, searchQuery);
      setRequests(result.requests);
    } catch (error) {
      console.error('Failed to load feature requests:', error);
      toast.error('Failed to load feature requests');
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, searchQuery]);

  // Load request details and replies
  const loadRequestDetails = useCallback(async (requestId: string) => {
    setIsLoadingReplies(true);
    try {
      const [request, repliesData] = await Promise.all([
        getFeatureRequestById(requestId),
        getReplies(requestId),
      ]);
      if (request) {
        setSelectedRequest(request);
        setReplies(repliesData);
      }
    } catch (error) {
      console.error('Failed to load request details:', error);
      toast.error('Failed to load request details');
    } finally {
      setIsLoadingReplies(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Filter and sort requests
  const filteredRequests = useMemo(() => {
    let filtered = [...requests];

    // Filter for "yours" option is handled server-side, but we also handle it here for real-time filtering
    if (sortBy === 'yours' && user?.id) {
      filtered = filtered.filter((r) => r.userId === user.id);
    }

    // Sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'popular':
          return b.upvoteCount - a.upvoteCount;
        case 'newest':
        case 'yours':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [requests, sortBy, user?.id]);

  // Sort replies
  const sortedReplies = useMemo(
    () =>
      [...replies].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortRepliesAscending ? dateA - dateB : dateB - dateA;
      }),
    [replies, sortRepliesAscending]
  );

  // Handle upvote
  const handleUpvote = useCallback(async (request: FeatureRequest, e?: React.MouseEvent) => {
    e?.stopPropagation();

    // Optimistic update
    const newHasUpvoted = !request.hasUpvoted;
    const newCount = newHasUpvoted ? request.upvoteCount + 1 : request.upvoteCount - 1;

    setRequests((prev) =>
      prev.map((r) =>
        r.id === request.id ? { ...r, hasUpvoted: newHasUpvoted, upvoteCount: newCount } : r
      )
    );

    if (selectedRequest?.id === request.id) {
      setSelectedRequest((prev) =>
        prev ? { ...prev, hasUpvoted: newHasUpvoted, upvoteCount: newCount } : null
      );
    }

    try {
      const result = await toggleUpvote(request.id);
      // Update with server response
      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id ? { ...r, hasUpvoted: result.hasUpvoted, upvoteCount: result.newCount } : r
        )
      );
      if (selectedRequest?.id === request.id) {
        setSelectedRequest((prev) =>
          prev ? { ...prev, hasUpvoted: result.hasUpvoted, upvoteCount: result.newCount } : null
        );
      }
    } catch (error) {
      // Revert on error
      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id ? { ...r, hasUpvoted: request.hasUpvoted, upvoteCount: request.upvoteCount } : r
        )
      );
      if (selectedRequest?.id === request.id) {
        setSelectedRequest((prev) =>
          prev ? { ...prev, hasUpvoted: request.hasUpvoted, upvoteCount: request.upvoteCount } : null
        );
      }
      toast.error('Failed to toggle upvote');
    }
  }, [selectedRequest?.id]);

  // Handle delete request
  const handleDeleteRequest = async () => {
    if (!deleteRequestId) return;
    setIsDeleting(true);
    try {
      await deleteFeatureRequest(deleteRequestId);
      setRequests((prev) => prev.filter((r) => r.id !== deleteRequestId));
      if (selectedRequest?.id === deleteRequestId) {
        setSelectedRequest(null);
        setReplies([]);
      }
      toast.success('Feature request deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete request');
    } finally {
      setIsDeleting(false);
      setDeleteRequestId(null);
    }
  };

  // Handle delete reply
  const handleDeleteReply = async () => {
    if (!deleteReplyId || !selectedRequest) return;
    setIsDeleting(true);
    try {
      await deleteReply(deleteReplyId);
      setReplies((prev) => prev.filter((r) => r.id !== deleteReplyId));
      // Update reply count
      setSelectedRequest((prev) => prev ? { ...prev, replyCount: prev.replyCount - 1 } : null);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === selectedRequest.id ? { ...r, replyCount: r.replyCount - 1 } : r
        )
      );
      toast.success('Reply deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete reply');
    } finally {
      setIsDeleting(false);
      setDeleteReplyId(null);
    }
  };

  // Handle request created
  const handleRequestCreated = (newRequest: FeatureRequest) => {
    setRequests((prev) => [newRequest, ...prev]);
    setSelectedRequest(newRequest);
    setReplies([]);
  };

  // Handle reply created
  const handleReplyCreated = (newReply: FeatureRequestReply) => {
    setReplies((prev) => [...prev, newReply]);
    // Update reply count
    setSelectedRequest((prev) => prev ? { ...prev, replyCount: prev.replyCount + 1 } : null);
    setRequests((prev) =>
      prev.map((r) =>
        r.id === newReply.featureRequestId ? { ...r, replyCount: r.replyCount + 1 } : r
      )
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string | null) => {
    if (status === 'in_progress') {
      return <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/30">In Progress</Badge>;
    }
    if (status === 'completed') {
      return <Badge variant="outline" className="bg-green-500/15 text-green-600 border-green-500/30">Completed</Badge>;
    }
    return null;
  };

  const canDeleteRequest = selectedRequest?.userId === user?.id && selectedRequest?.status === null;

  // Handle back button on mobile
  const handleMobileBack = () => {
    setSelectedRequest(null);
    setReplies([]);
  };

  // Render the list view (sidebar content)
  const renderList = () => (
    <div className={cn(
      'bg-background flex flex-col',
      isMobile ? 'w-full h-full' : 'w-[400px] border-r'
    )}>
      {/* Header */}
      <div className="px-4 my-2 flex items-center justify-between">
        <h2 className="text-[22px] font-semibold">Feature Requests</h2>
        <Button size="sm" onClick={() => setIsAddRequestOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="px-4 pb-3 space-y-3 border-b">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={sortBy === option.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSortBy(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Request List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {searchQuery ? 'No requests found' : 'No feature requests yet'}
          </div>
        ) : (
          <div>
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                role="button"
                tabIndex={0}
                onClick={() => loadRequestDetails(request.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    loadRequestDetails(request.id);
                  }
                }}
                className={cn(
                  'w-full text-left px-4 py-3 border-b transition-colors hover:bg-accent cursor-pointer',
                  !isMobile && selectedRequest?.id === request.id && 'bg-accent'
                )}
              >
                <div className="flex gap-3 items-start">
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* User row */}
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="h-5 w-5">
                        {request.profilePictureUrl && (
                          <AvatarImage src={request.profilePictureUrl} />
                        )}
                        <AvatarFallback className="text-[10px]">
                          {request.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground truncate">
                        {request.userName}
                      </span>
                    </div>

                    {/* Title */}
                    <p className="text-sm font-medium line-clamp-2">
                      {request.title}
                    </p>

                    {/* Description preview */}
                    {request.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {request.description}
                      </p>
                    )}

                    {/* Status pill (if exists) */}
                    {request.status && (
                      <div className="mt-2">
                        {getStatusBadge(request.status)}
                      </div>
                    )}

                    {/* Meta pills row */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium border-primary/50 text-primary">
                        {request.userType === 'coach' ? 'Coach' : 'Client'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium border-primary/50 text-primary flex items-center gap-1">
                        <MessageCircle className="h-2.5 w-2.5" />
                        {request.replyCount}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium border-primary/50 text-primary">
                        {formatDate(request.createdAt)}
                      </Badge>
                    </div>
                  </div>

                  {/* Upvote */}
                  <button
                    type="button"
                    onClick={(e) => handleUpvote(request, e)}
                    className={cn(
                      'flex flex-col items-center px-3 py-1 rounded-md border shrink-0',
                      request.hasUpvoted
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-muted-foreground/40 hover:border-primary/50'
                    )}
                  >
                    <ChevronUp className={cn('h-4 w-4', request.hasUpvoted && 'stroke-[3px]')} />
                    <span className="text-xs font-medium">{request.upvoteCount}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Render the detail view
  const renderDetail = () => (
    <div className={cn(
      'flex flex-col overflow-hidden',
      isMobile ? 'w-full h-full' : 'flex-1'
    )}>
      {selectedRequest ? (
        <>
          {/* Detail Header */}
          <div className="px-4 py-2 border-b flex items-center justify-between gap-2">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMobileBack}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h2 className="text-lg font-semibold truncate flex-1">{selectedRequest.title}</h2>
            <div className="flex items-center gap-2 shrink-0">
              {canDeleteRequest && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteRequestId(selectedRequest.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button onClick={() => setIsAddReplyOpen(true)}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Reply
              </Button>
            </div>
          </div>

          {/* Detail Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Request Card */}
            <Card>
              <CardContent className="px-4">
                <div className="flex gap-4">
                  {/* Content */}
                  <div className="flex-1">
                    {/* User row */}
                    <div className="flex items-center gap-2 mb-3">
                      <Avatar className="h-7 w-7">
                        {selectedRequest.profilePictureUrl && (
                          <AvatarImage src={selectedRequest.profilePictureUrl} />
                        )}
                        <AvatarFallback className="text-xs">
                          {selectedRequest.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {selectedRequest.userName}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-semibold">
                      {selectedRequest.title}
                    </h3>

                    {/* Description */}
                    {selectedRequest.description && (
                      <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                        {selectedRequest.description}
                      </p>
                    )}

                    {/* Status pill (if exists) */}
                    {selectedRequest.status && (
                      <div className="mt-3">
                        {getStatusBadge(selectedRequest.status)}
                      </div>
                    )}

                    {/* Meta pills row */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-3">
                      <Badge variant="outline" className="text-xs px-2 py-0 font-medium border-primary/50 text-primary">
                        {selectedRequest.userType === 'coach' ? 'Coach' : 'Client'}
                      </Badge>
                      <Badge variant="outline" className="text-xs px-2 py-0 font-medium border-primary/50 text-primary flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {selectedRequest.replyCount}
                      </Badge>
                      <Badge variant="outline" className="text-xs px-2 py-0 font-medium border-primary/50 text-primary">
                        {formatDate(selectedRequest.createdAt)}
                      </Badge>
                    </div>
                  </div>

                  {/* Upvote */}
                  <button
                    type="button"
                    onClick={() => handleUpvote(selectedRequest)}
                    className={cn(
                      'flex flex-col items-center justify-center px-4 py-3 rounded-lg border self-start',
                      selectedRequest.hasUpvoted
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <ChevronUp className={cn('h-5 w-5', selectedRequest.hasUpvoted && 'stroke-[3px]')} />
                    <span className="text-sm font-semibold">{selectedRequest.upvoteCount}</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Replies Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">
                  {replies.length === 0
                    ? 'No replies yet'
                    : replies.length === 1
                    ? '1 Reply'
                    : `${replies.length} Replies`}
                </h4>
                {replies.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSortRepliesAscending(!sortRepliesAscending)}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {isLoadingReplies ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : replies.length === 0 ? (
                <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setIsAddReplyOpen(true)}>
                  <CardContent className="p-4 text-center text-muted-foreground text-sm">
                    Be the first to reply to this feature request!
                  </CardContent>
                </Card>
              ) : (
                sortedReplies.map((reply) => (
                  <Card key={reply.id}>
                    <CardContent className="px-4">
                      {/* User row */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            {reply.profilePictureUrl && (
                              <AvatarImage src={reply.profilePictureUrl} />
                            )}
                            <AvatarFallback className="text-[10px]">
                              {reply.userName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{reply.userName}</span>
                        </div>
                        {reply.userId === user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setDeleteReplyId(reply.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                      {/* Meta pills row */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-3">
                        <Badge variant="outline" className="text-xs px-2 py-0 font-medium border-primary/50 text-primary">
                          {reply.userType === 'coach' ? 'Coach' : 'Client'}
                        </Badge>
                        <Badge variant="outline" className="text-xs px-2 py-0 font-medium border-primary/50 text-primary">
                          {formatDate(reply.createdAt)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Select a feature request to view details</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full w-full flex">
      {isMobile ? (
        // Mobile: Show list OR detail, not both
        selectedRequest ? renderDetail() : renderList()
      ) : (
        // Desktop: Show list AND detail side by side
        <>
          {renderList()}
          {renderDetail()}
        </>
      )}

      {/* Dialogs */}
      <AddFeatureRequestDialog
        open={isAddRequestOpen}
        onOpenChange={setIsAddRequestOpen}
        onCreated={handleRequestCreated}
      />

      {selectedRequest && (
        <AddReplyDialog
          open={isAddReplyOpen}
          onOpenChange={setIsAddReplyOpen}
          featureRequestId={selectedRequest.id}
          onCreated={handleReplyCreated}
        />
      )}

      {/* Delete Request Confirmation */}
      <AlertDialog open={!!deleteRequestId} onOpenChange={() => setDeleteRequestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature Request?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the feature request and all its replies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRequest}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Reply Confirmation */}
      <AlertDialog open={!!deleteReplyId} onOpenChange={() => setDeleteReplyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reply?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReply}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
