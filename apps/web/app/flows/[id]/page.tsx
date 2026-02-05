'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { ChevronRight } from 'lucide-react';
import { FlowEditor } from '@/components/flows/flow-editor';
import { EditFlowSidePanel } from '@/components/flows/edit-flow-side-panel';
import { getFlowById, updateFlowDetails, updateFlowStatus, type Flow } from '@/api/coach/coach-flow-service';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const FlowDetailPage = () => {
  const t = useTranslations();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const flowId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [flow, setFlow] = useState<Flow | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditFlowOpen, setIsEditFlowOpen] = useState(false);

  useEffect(() => {
    const fetchFlow = async () => {
      setIsLoading(true);
      try {
        const data = await getFlowById(flowId);
        setFlow(data);
      } catch (error) {
        console.error('Failed to fetch flow:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFlow();
  }, [flowId]);

  const handleBreadcrumbClick = (path: string) => {
    router.push(path);
  };

  const handleEditFlow = async (data: { name: string; description?: string }) => {
    await updateFlowDetails({
      id: flowId,
      name: data.name,
      description: data.description,
    });

    // Update local state
    setFlow(prev => prev ? { ...prev, name: data.name, description: data.description || '' } : prev);
  };

  const handleTogglePublish = async (isActive: boolean) => {
    try {
      await updateFlowStatus(flowId, isActive);
      setFlow(prev => prev ? { ...prev, is_active: isActive } : prev);
      toast.success(isActive ? 'Flow published' : 'Flow unpublished');
    } catch (error) {
      console.error('Failed to update flow status:', error);
      toast.error('Failed to update flow status');
    }
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">{t('flows.notFound')}</h1>
          <p className="text-muted-foreground">{t('flows.notFoundDescription')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Full Width Header */}
      <div className="w-full relative flex-shrink-0">
        <div className="px-4 flex items-start justify-between gap-4 mb-2 mt-2">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <Breadcrumb>
              <BreadcrumbList className="text-xs gap-1">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={() => handleBreadcrumbClick('/flows')}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                  >
                    {t('flows.title')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/60">
                  <ChevronRight className="h-2 w-2" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                    {flow.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-semibold">{flow.name}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={flow.is_active ? "outline" : "default"}
              onClick={() => handleTogglePublish(!flow.is_active)}
            >
              {flow.is_active ? 'Unpublish' : 'Publish'}
            </Button>
          </div>
        </div>
        <Separator />
      </div>

      {/* Flow Editor */}
      <FlowEditor
        flow={flow}
        onFlowChange={(nodes, edges) => {
          // Manual save will be handled inside FlowEditor or via a header button
        }}
      />

      {/* Edit Flow Side Panel */}
      <EditFlowSidePanel
        open={isEditFlowOpen}
        onOpenChange={setIsEditFlowOpen}
        flowId={flowId}
        initialName={flow.name || ''}
        initialDescription={flow.description || ''}
        onSave={handleEditFlow}
      />
    </div>
  );
};

export default FlowDetailPage;
