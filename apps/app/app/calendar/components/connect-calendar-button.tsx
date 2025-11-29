'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConnectCalendarModal } from './connect-calendar-modal';

export const ConnectCalendarButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpenModal();
    }
  };

  return (
    <>
      <Button
        onClick={handleOpenModal}
        onKeyDown={handleKeyDown}
        className="mt-2"
        aria-label="Connect Calendar"
      >
        Connect Calendar
      </Button>
      <ConnectCalendarModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
};

