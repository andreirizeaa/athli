'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClientBioCard } from './client-bio-card';
import { GoalsCard } from './goals-card';
import { InjuryCard } from './injury-card';
import { AthleteWorkoutsCard } from './athlete-workouts-card';

const ClientOverviewPage = () => {
  const params = useParams<{ clientId: string; contactId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  // Support both clientId (athletes context) and contactId (inbox context)
  const clientIdFromParams = params.clientId || params.contactId;
  const clientId = Array.isArray(clientIdFromParams) ? clientIdFromParams[0] : clientIdFromParams;

  // Read URL params for deep-linking to specific items
  const [initialGoalId, setInitialGoalId] = useState<string | null>(null);
  const [initialInjuryId, setInitialInjuryId] = useState<string | null>(null);

  useEffect(() => {
    const openGoal = searchParams.get('openGoal');
    const openInjury = searchParams.get('openInjury');

    if (openGoal) {
      setInitialGoalId(openGoal);
    }
    if (openInjury) {
      setInitialInjuryId(openInjury);
    }

    // Clear URL params after reading to prevent re-triggering on navigation
    if (openGoal || openInjury) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('openGoal');
      newParams.delete('openInjury');
      const newUrl = newParams.toString()
        ? `/athletes/${clientId}/overview?${newParams.toString()}`
        : `/athletes/${clientId}/overview`;
      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, clientId, router]);

  return (
    <div className="h-full w-full flex flex-col flex-1 min-h-0 p-4 gap-4 overflow-hidden">
      {clientId && (
        <div className="w-full h-full flex gap-4 items-stretch">
          <div className="flex flex-col gap-4 h-full flex-1 min-w-0">
            <div className="h-1/2 min-h-0 flex">
              <ClientBioCard clientId={clientId} />
            </div>
            <div className="h-1/2 min-h-0 flex">
              <AthleteWorkoutsCard clientId={clientId} />
            </div>
          </div>
          <div className="flex flex-col gap-4 h-full flex-1 min-w-0">
            <div className="h-1/2 min-h-0 flex">
              <GoalsCard clientId={clientId} initialSelectedGoalId={initialGoalId} />
            </div>
            <div className="h-1/2 min-h-0 flex">
              <InjuryCard clientId={clientId} initialSelectedInjuryId={initialInjuryId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientOverviewPage;
