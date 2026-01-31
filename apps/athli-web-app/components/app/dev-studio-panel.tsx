'use client';

import { useState } from 'react';
import { Loader2, Database, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidePanel } from './side-panel';
import { addSeedData, removeSeedData, SeedDataResult, RemoveDataResult } from '@/api/dev/seed-data-service';

type DevStudioPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type OperationStatus = 'idle' | 'loading' | 'success' | 'error';

export function DevStudioPanel({ open, onOpenChange }: DevStudioPanelProps) {
  const [addStatus, setAddStatus] = useState<OperationStatus>('idle');
  const [removeStatus, setRemoveStatus] = useState<OperationStatus>('idle');
  const [addResult, setAddResult] = useState<SeedDataResult | null>(null);
  const [removeResult, setRemoveResult] = useState<RemoveDataResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddSeedData = async () => {
    setAddStatus('loading');
    setError(null);
    setAddResult(null);

    try {
      const response = await addSeedData();
      if (response.success && response.data) {
        setAddResult(response.data);
        setAddStatus('success');
        // Reload page after a brief delay to show success state
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw new Error(response.message || 'Failed to add seed data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add seed data');
      setAddStatus('error');
      setTimeout(() => setAddStatus('idle'), 5000);
    }
  };

  const handleRemoveSeedData = async () => {
    setRemoveStatus('loading');
    setError(null);
    setRemoveResult(null);

    try {
      const response = await removeSeedData();
      if (response.success && response.data) {
        setRemoveResult(response.data);
        setRemoveStatus('success');
        // Reload page after a brief delay to show success state
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw new Error(response.message || 'Failed to remove seed data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove seed data');
      setRemoveStatus('error');
      setTimeout(() => setRemoveStatus('idle'), 5000);
    }
  };

  const getAddButtonContent = () => {
    switch (addStatus) {
      case 'loading':
        return (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            Creating...
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle2 className="size-4 mr-2" />
            Created
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="size-4 mr-2" />
            Failed
          </>
        );
      default:
        return (
          <>
            <Database className="size-4 mr-2" />
            Add Seed Data
          </>
        );
    }
  };

  const getRemoveButtonContent = () => {
    switch (removeStatus) {
      case 'loading':
        return (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            Removing...
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle2 className="size-4 mr-2" />
            Removed
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="size-4 mr-2" />
            Failed
          </>
        );
      default:
        return (
          <>
            <Trash2 className="size-4 mr-2" />
            Remove Seed Data
          </>
        );
    }
  };

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title="Dev Studio"
    >
      <div className="space-y-6 py-4">
        {/* Add Seed Data Section */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Seed Test Data</h3>
          <p className="text-sm text-muted-foreground">
            Create 5 test clients with comprehensive data including metrics, habits,
            workouts, training history, and message conversations.
          </p>
          <Button
            onClick={handleAddSeedData}
            disabled={addStatus === 'loading' || removeStatus === 'loading'}
            className="w-full"
            variant={addStatus === 'success' ? 'outline' : 'default'}
          >
            {getAddButtonContent()}
          </Button>

          {/* Add Result Summary */}
          {addResult && addStatus === 'success' && (
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md space-y-1">
              <p className="font-medium text-foreground">Created:</p>
              <p>{addResult.clients} test clients</p>
              <p>
                {addResult.coachLibrary.metrics} metrics,{' '}
                {addResult.coachLibrary.habits} habits,{' '}
                {addResult.coachLibrary.exercises} exercises
              </p>
              <p>
                {addResult.coachLibrary.workouts} workouts,{' '}
                {addResult.coachLibrary.programs} programs
              </p>
              <p>
                {addResult.training.trainingEntries} training entries,{' '}
                {addResult.messaging.messages} messages
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Remove Seed Data Section */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Remove Test Data</h3>
          <p className="text-sm text-muted-foreground">
            Delete all test clients and data prefixed with [TEST]. This will remove
            all seeded data while preserving your real data.
          </p>
          <Button
            variant={removeStatus === 'success' ? 'outline' : 'destructive'}
            onClick={handleRemoveSeedData}
            disabled={addStatus === 'loading' || removeStatus === 'loading'}
            className="w-full"
          >
            {getRemoveButtonContent()}
          </Button>

          {/* Remove Result Summary */}
          {removeResult && removeStatus === 'success' && (
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md space-y-1">
              <p className="font-medium text-foreground">Removed:</p>
              <p>{removeResult.deletedClients} test clients</p>
              <p>
                {removeResult.deletedItems.coachMetrics} metrics,{' '}
                {removeResult.deletedItems.coachHabits} habits,{' '}
                {removeResult.deletedItems.coachExercises} exercises
              </p>
              <p>
                {removeResult.deletedItems.coachWorkouts} workouts,{' '}
                {removeResult.deletedItems.coachPrograms} programs
              </p>
              <p>{removeResult.deletedItems.conversations} conversations</p>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <>
            <Separator />
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </>
        )}

        <Separator />

        {/* Info Section */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">About Test Data</h3>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>
              Test data is identified by the <code className="bg-muted px-1 rounded">[TEST]</code>{' '}
              prefix in names and <code className="bg-muted px-1 rounded">@athli.dev</code> email domain.
            </p>
            <p>
              <strong>Test Clients:</strong>
            </p>
            <ul className="list-disc list-inside pl-2 space-y-0.5">
              <li>Sarah Johnson (online)</li>
              <li>Michael Williams (in-person)</li>
              <li>Emma Williams (hybrid)</li>
              <li>Sarah Chen (online)</li>
              <li>James Rodriguez (invited)</li>
            </ul>
            <p className="text-[10px] mt-2">
              Note: Two clients share the first name &quot;Sarah&quot; and two share the last
              name &quot;Williams&quot; to test search functionality.
            </p>
            <p className="mt-3">
              <strong>Mobile App Logins:</strong>
            </p>
            <ul className="list-none pl-2 space-y-1 font-mono text-[10px]">
              <li>test.client.1@athli.dev</li>
              <li>test.client.2@athli.dev</li>
              <li>test.client.3@athli.dev</li>
              <li>test.client.4@athli.dev</li>
              <li>test.client.5@athli.dev</li>
            </ul>
            <p className="mt-1">
              <strong>Password:</strong>{' '}
              <code className="bg-muted px-1 rounded">TestPassword123!</code>
            </p>
          </div>
        </div>
      </div>
    </SidePanel>
  );
}
