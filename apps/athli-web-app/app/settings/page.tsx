import { redirect } from 'next/navigation';

const SettingsPage = () => {
  redirect('/settings/account/profile');
};

export default SettingsPage;
