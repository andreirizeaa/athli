'use client';

import { useClientProfileContext } from '../client-profile-context';

export default function UpdatesPage() {
  // Get updates from context (already loaded with other client data)
  const { updates, isLoading } = useClientProfileContext();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4">
        {/* UI components will be added here */}
      </div>
    </div>
  );
}

