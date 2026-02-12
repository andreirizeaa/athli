'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Folder, FolderOutput, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/general/utils';

interface Folder {
  id: string;
  name: string;
}

interface MoveToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  currentFolderId?: string | null;
  onMove: (folderId: string | null) => Promise<void>;
  itemName?: string;
}

export const MoveToFolderDialog = ({
  open,
  onOpenChange,
  folders,
  currentFolderId,
  onMove,
  itemName,
}: MoveToFolderDialogProps) => {
  const t = useTranslations();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const handleMove = async () => {
    setIsMoving(true);
    try {
      await onMove(selectedFolderId);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to move item:', error);
    } finally {
      setIsMoving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedFolderId(null);
    }
    onOpenChange(newOpen);
  };

  // Filter out the current folder from options
  const availableFolders = folders.filter(f => f.id !== currentFolderId);
  const canMoveOutOfFolder = !!currentFolderId;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {itemName ? `Move "${itemName}"` : 'Move to Folder'}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-2">
          {canMoveOutOfFolder && (
            <button
              type="button"
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                selectedFolderId === null
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-accent'
              )}
              onClick={() => setSelectedFolderId(null)}
            >
              <div className="p-2 bg-muted rounded-lg">
                <FolderOutput className="size-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium">Move outside of folder</span>
            </button>
          )}
          {availableFolders.length > 0 && (
            <>
              {canMoveOutOfFolder && (
                <div className="text-xs text-muted-foreground py-2">Or move to another folder:</div>
              )}
              {availableFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                    selectedFolderId === folder.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent'
                  )}
                  onClick={() => setSelectedFolderId(folder.id)}
                >
                  <div className="p-2 bg-muted rounded-lg">
                    <Folder className="size-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium">{folder.name}</span>
                </button>
              ))}
            </>
          )}
          {availableFolders.length === 0 && !canMoveOutOfFolder && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No folders available. Create a folder first.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isMoving}
          >
            {t('general.cancel')}
          </Button>
          <Button
            onClick={handleMove}
            disabled={selectedFolderId === undefined || isMoving || (availableFolders.length === 0 && !canMoveOutOfFolder)}
            className="gap-2"
          >
            {isMoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
