import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Settings',
};

const SettingsPage = () => {
  redirect('/settings/account/profile');
};

export default SettingsPage;
