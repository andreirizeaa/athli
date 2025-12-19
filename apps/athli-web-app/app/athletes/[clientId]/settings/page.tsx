import { redirect } from 'next/navigation';

type AthleteSettingsPageProps = {
  params: Promise<{ clientId: string }>;
};

const AthleteSettingsPage = async ({ params }: AthleteSettingsPageProps) => {
  const resolvedParams = await params;
  const clientId = Array.isArray(resolvedParams.clientId) ? resolvedParams.clientId[0] : resolvedParams.clientId;
  redirect(`/athletes/${clientId}/settings/danger`);
};

export default AthleteSettingsPage;
