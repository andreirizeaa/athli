'use client';

import { UserProfile } from '@clerk/nextjs';

const AccountPage = () => {
  return (
    <div className="h-full w-full overflow-auto flex items-center justify-center px-3">
      <div className="w-full max-w-4xl">
        <UserProfile 
          routing="path"
          path="/settings/profile/account"
        />
      </div>
    </div>
  );
};

export default AccountPage;

