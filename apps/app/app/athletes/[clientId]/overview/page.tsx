'use client';

import { useParams } from 'next/navigation';
import { NotesCard } from './notes-card';
import { ClientBioCard } from './client-bio-card';
import { GoalsCard } from './goals-card';
import { InjuryCard } from './injury-card';
import { ClientDetailsCard } from './client-details-card';
import { ClientForCard } from './client-for-card';
import { AthleteWorkoutsCard } from './athlete-workouts-card';
import { CurrentAssignedItemCard } from './current-assigned-item-card';
import { StrengthOverviewCard } from './strength-overview-card';
import { WeightOverviewCard } from './weight-overview-card';

const ClientOverviewPage = () => {
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;

  return (
    <div className="w-full h-full bg-secondary flex flex-col items-start justify-start px-4 pt-4 pb-2 gap-4 overflow-auto">
      {clientId && (
        <>
          <div className="w-full flex gap-4">
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
              <ClientForCard clientId={clientId} />
          </div>
          </div>
          <div className="w-full flex gap-4 items-start mb-24">
            <div style={{ width: 'calc(50% - 0.5rem)', flexShrink: 0 }}>
              <NotesCard clientId={clientId} />
            </div>
            <div className="flex flex-col gap-4" style={{ width: 'calc(50% - 0.5rem)', flexShrink: 0 }}>
              <CurrentAssignedItemCard clientId={clientId} />
              <div className="flex gap-4">
                <div style={{ width: 'calc(50% - 0.5rem)', flexShrink: 0 }}>
                  <StrengthOverviewCard clientId={clientId} />
                </div>
                <div style={{ width: 'calc(50% - 0.5rem)', flexShrink: 0 }}>
                  <WeightOverviewCard clientId={clientId} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClientOverviewPage;
