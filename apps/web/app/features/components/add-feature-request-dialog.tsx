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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useGlobalData } from '@/providers/global-data-provider';
import {
  createFeatureRequest,
  type FeatureRequest,
} from '@/api/feature-requests/feature-requests-service';

interface AddFeatureRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (request: FeatureRequest) => void;
}

export function AddFeatureRequestDialog({
  open,
  onOpenChange,
  onCreated,
}: AddFeatureRequestDialogProps) {
  const { user } = useGlobalData();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = title.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to create a feature request');
      return;
    }

    if (!isValid) {
      toast.error('Please enter a title');
      return;
    }

    setIsSubmitting(true);
    try {
      const newRequest = await createFeatureRequest(
        {
          title: title.trim(),
          description: description.trim() || undefined,
        },
        {
          userName: user.name || user.email || 'User',
          userType: 'coach', // Web app is coach-only for now
          profilePictureUrl: user.profilePictureUrl || null,
        }
      );

      toast.success('Feature request created!');
      onCreated(newRequest);
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create feature request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Feature Request</DialogTitle>
            <DialogDescription>
              Share your ideas for new features or improvements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a short, descriptive title"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide more details about your feature request (optional)"
                disabled={isSubmitting}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
