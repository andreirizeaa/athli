'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useGlobalData } from '@/providers/global-data-provider';
import {
  createReply,
  type FeatureRequestReply,
} from '@/api/feature-requests/feature-requests-service';

interface AddReplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureRequestId: string;
  onCreated: (reply: FeatureRequestReply) => void;
}

export function AddReplyDialog({
  open,
  onOpenChange,
  featureRequestId,
  onCreated,
}: AddReplyDialogProps) {
  const { user } = useGlobalData();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = message.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to reply');
      return;
    }

    if (!isValid) {
      toast.error('Please enter a message');
      return;
    }

    setIsSubmitting(true);
    try {
      const newReply = await createReply(
        {
          featureRequestId,
          message: message.trim(),
        },
        {
          userName: user.name || user.email || 'User',
          userType: 'coach', // Web app is coach-only for now
          profilePictureUrl: user.profilePictureUrl || null,
        }
      );

      toast.success('Reply added!');
      onCreated(newReply);
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setMessage('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Reply</DialogTitle>
            <DialogDescription>
              Share your thoughts or suggestions on this feature request.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="message">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your reply..."
                disabled={isSubmitting}
                rows={4}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add Reply
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
