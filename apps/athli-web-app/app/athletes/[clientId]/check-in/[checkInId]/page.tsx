import { redirect } from 'next/navigation';
import { getClientCheckInsForForm } from '@/lib/forms/form-service';

type CheckInDetailPageProps = {
  params: Promise<{ clientId: string; checkInId: string }>;
};

const CheckInDetailPage = async ({ params }: CheckInDetailPageProps) => {
  const resolvedParams = await params;
  const clientId = Array.isArray(resolvedParams.clientId) ? resolvedParams.clientId[0] : resolvedParams.clientId;
  const checkInId = Array.isArray(resolvedParams.checkInId) ? resolvedParams.checkInId[0] : resolvedParams.checkInId;

  // Get all instances for this check-in
  const instances = await getClientCheckInsForForm(clientId, checkInId);

  // Redirect to the first instance if available
  if (instances.length > 0) {
    redirect(`/athletes/${clientId}/check-in/${checkInId}/${instances[0].id}`);
  }

  // If no instances, show error
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2">No check-in instances found</h1>
        <p className="text-muted-foreground">This check-in form has no scheduled instances.</p>
      </div>
    </div>
  );
};

export default CheckInDetailPage;
