'use client';

import { useParams } from 'next/navigation';
import { useClientUpdates } from '@/hooks/use-client-updates';

export default function UpdatesPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;

  // Query updates data (but don't display it)
  const { updates, isLoading } = useClientUpdates(clientId);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4">
        {/* UI components will be added here */}
      </div>
    </div>
  );
}


