'use client';

import { useState } from 'react';
import { Database, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { seedScreenshotData, cleanScreenshotData } from '@/api/user/user-service';
import { toast } from 'sonner';

/**
 * Dev-only button to seed/clean screenshot demo data.
 * Only renders when NEXT_PUBLIC_DEV_TOOLS=true
 */
export function SeedDataButton() {
  const [loading, setLoading] = useState(false);

  if (process.env.NEXT_PUBLIC_DEV_TOOLS !== 'true') return null;

  const handleSeed = async () => {
    setLoading(true);
    try {
      const result = await seedScreenshotData();
      toast.success(`Created ${result.clientsCreated} demo clients`);
    } catch (err) {
      toast.error('Failed to seed data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClean = async () => {
    setLoading(true);
    try {
      const result = await cleanScreenshotData();
      toast.success(`Removed ${result.clientsRemoved} demo clients`);
    } catch (err) {
      toast.error('Failed to clean data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={loading}
              className="text-muted-foreground"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Seed Data (Dev)</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleSeed} disabled={loading}>
          <Database className="mr-2 h-4 w-4" />
          Seed Screenshot Data
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleClean} disabled={loading} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Clean Screenshot Data
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
