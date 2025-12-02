'use client';

import { useParams } from 'next/navigation';
import { NotesCard } from './notes-card';
import { ClientBioCard } from './client-bio-card';
import { GoalsCard } from './goals-card';
import { InjuryCard } from './injury-card';
import { ClientDetailsCard } from './client-details-card';
import { AthleteTrainingCard } from './athlete-training-card';

const ClientOverviewPage = () => {
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;

  return (
    <div className="w-full h-full bg-secondary flex flex-col items-start justify-start px-4 pt-4 pb-2 gap-4 overflow-auto">
      {clientId && (
        <>
          <div className="w-full flex gap-4">
            <ClientBioCard clientId={clientId} />
            <ClientDetailsCard clientId={clientId} />
          </div>
          <div className="w-full flex gap-4">
            <AthleteTrainingCard clientId={clientId} />
          </div>
          <div className="w-full flex gap-4 items-start">
            <div style={{ width: '50vw', minWidth: '50vw', maxWidth: '50vw' }}>
              <NotesCard clientId={clientId} />
            </div>
            <div className="flex flex-col gap-4" style={{ width: '25%', minWidth: '25%', maxWidth: '25%', height: 'calc(40vh + 120px + 8px)' }}>
              <GoalsCard clientId={clientId} />
              <InjuryCard clientId={clientId} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClientOverviewPage;
