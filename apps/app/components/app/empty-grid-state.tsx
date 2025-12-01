'use client';

import React from 'react';

interface EmptyGridStateProps {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}

export const EmptyGridState = ({ title, subtitle, action }: EmptyGridStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12">
      <h3 className="text-4xl font-bold">{title}</h3>
      <div className="max-w-[500px] w-full mx-auto flex justify-center">
        <p className="text-l font-semibold text-muted-foreground text-center">
          {subtitle}
        </p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};

