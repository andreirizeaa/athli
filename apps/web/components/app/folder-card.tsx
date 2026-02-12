'use client';

import { useState } from 'react';
import { Folder, MoreHorizontal, Edit, Trash2, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from 'next-intl';

interface FolderCardProps {
  name: string;
  itemCount?: number;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAssign?: () => void;
}

export const FolderCard = ({
  name,
  itemCount,
  onClick,
  onEdit,
  onDelete,
  onAssign,
}: FolderCardProps) => {
  const t = useTranslations();
  const hasActions = onEdit || onDelete || onAssign;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <Card
      className="p-4 cursor-pointer hover:bg-accent transition-colors group relative min-w-[200px] flex-shrink-0"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted rounded-lg">
          <Folder className="size-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium truncate">{name}</h3>
          {itemCount !== undefined && (
            <p className="text-xs text-muted-foreground">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>
        {hasActions && (
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 transition-opacity ${isDropdownOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Edit className="size-4 mr-2" />
                  <span>{t('general.edit')}</span>
                </DropdownMenuItem>
              )}
              {onAssign && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsDropdownOpen(false);
                    // Use longer delay + requestAnimationFrame to ensure dropdown focus cleanup completes
                    setTimeout(() => {
                      requestAnimationFrame(() => {
                        onAssign();
                      });
                    }, 250);
                  }}
                >
                  <UserPlus className="size-4 mr-2" />
                  <span>{t('forms.assignToClients')}</span>
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4 mr-2 text-destructive" />
                  <span>{t('general.delete')}</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </Card>
  );
};
