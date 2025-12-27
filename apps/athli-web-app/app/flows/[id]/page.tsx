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
import { ChevronRight, Pencil } from 'lucide-react';
import { FlowEditor } from '@/components/flows/flow-editor';
import { EditFlowSidePanel } from '@/components/flows/edit-flow-side-panel';
import { getFlowById, updateFlowDetails, type Flow } from '@/api/coach/coach-flow-service';
import type { Node, Edge } from 'reactflow';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';


// Empty initial nodes and edges
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const FlowDetailPage = () => {
  const t = useTranslations();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const flowId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [flow, setFlow] = useState<Flow | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
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

  const handleNodeClick = (_node: Node) => {
    setIsSidePanelOpen(true);
  };

  const handleCloseSidePanel = () => {
    setIsSidePanelOpen(false);
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

  const handleSaveFlow = (nodes: Node[], edges: Edge[]) => {
    // This is called when the manual save button in FlowEditor is clicked
    // Or we can just use the internal save of FlowEditor
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
            <h1 className="text-[22px] font-semibold">{flow.name}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setIsEditFlowOpen(true)}>
              <Pencil className="size-4" />
              <span>Edit flow details</span>
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
