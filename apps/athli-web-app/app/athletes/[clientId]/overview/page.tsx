'use client';

import { useParams } from 'next/navigation';
import { ClientBioCard } from './client-bio-card';
import { GoalsCard } from './goals-card';
import { InjuryCard } from './injury-card';
import { ClientDetailsCard } from './client-details-card';
import { AthleteWorkoutsCard } from './athlete-workouts-card';

const ClientOverviewPage = () => {
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;

  return (
    <div className="h-full w-full flex flex-col flex-1 min-h-0 p-4 gap-4 overflow-hidden">
      {clientId && (
        <div className="w-full h-full flex gap-4 items-stretch">
          <div className="flex flex-col gap-4 h-full" style={{ width: 'calc(50% - 0.67rem)', flexShrink: 0 }}>
            <div className="h-1/2 min-h-0 flex">
              <ClientBioCard clientId={clientId} />
            </div>
            <div className="h-1/2 min-h-0 flex">
              <AthleteWorkoutsCard clientId={clientId} />
            </div>
          </div>
          <div className="flex flex-col gap-4 h-full" style={{ width: 'calc(30% - 0.67rem)', flexShrink: 0 }}>
            <div className="h-1/2 min-h-0 flex">
              <GoalsCard clientId={clientId} />
            </div>
            <div className="h-1/2 min-h-0 flex">
              <InjuryCard clientId={clientId} />
            </div>
          </div>
          <div className="flex flex-col gap-4 h-full" style={{ width: 'calc(20% - 0.67rem)', flexShrink: 0 }}>
            <ClientDetailsCard clientId={clientId} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientOverviewPage;
