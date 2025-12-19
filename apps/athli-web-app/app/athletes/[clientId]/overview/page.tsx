'use client';

import { useParams } from 'next/navigation';
import { ClientBioCard } from './client-bio-card';
import { GoalsCard } from './goals-card';
import { InjuryCard } from './injury-card';
import { ClientDetailsCard } from './client-details-card';
import { AthleteWorkoutsCard } from './athlete-workouts-card';
import { CurrentAssignedItemCard } from './current-assigned-item-card';

const ClientOverviewPage = () => {
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;

  return (
    <div className="w-full h-full bg-background flex flex-col items-start justify-start px-4 pt-4 pb-2 gap-4">
      {clientId && (
        <>
          <div className="w-full flex gap-4 items-stretch">
            <div className="flex flex-col gap-4" style={{ width: 'calc(50% - 0.67rem)', flexShrink: 0 }}>
            <ClientBioCard clientId={clientId} />
              <AthleteWorkoutsCard clientId={clientId} />
            </div>
            <div className="flex flex-col gap-4" style={{ width: 'calc(30% - 0.67rem)', flexShrink: 0 }}>
              <GoalsCard clientId={clientId} />
              <InjuryCard clientId={clientId} />
            </div>
            <div className="flex flex-col gap-4" style={{ width: 'calc(20% - 0.67rem)', flexShrink: 0 }}>
            <ClientDetailsCard clientId={clientId} />
          </div>
          </div>
          <div className="w-full flex gap-4 items-start mb-24">
            <div className="flex flex-col gap-4" style={{ width: '100%', flexShrink: 0 }}>
              <CurrentAssignedItemCard clientId={clientId} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClientOverviewPage;
