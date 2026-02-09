'use client';

import React from 'react';

type CheckInLayoutProps = {
  children: React.ReactNode;
};

const CheckInLayout = ({ children }: CheckInLayoutProps) => {
  // Layout just passes through children - the page handles tabs and submissions view
  return <>{children}</>;
};

export default CheckInLayout;
