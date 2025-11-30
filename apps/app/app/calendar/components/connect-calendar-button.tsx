'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ConnectCalendarModal } from './connect-calendar-modal';

export const ConnectCalendarButton = () => {
  const t = useTranslations();
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
        aria-label={t('calendar.connectCalendar')}
      >
        {t('calendar.connectCalendar')}
      </Button>
      <ConnectCalendarModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
};

