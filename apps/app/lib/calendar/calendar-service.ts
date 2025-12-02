export interface DeleteCalendarEventData {
  eventId: string;
}

/**
 * Delete a calendar event through the provider
 * This will be connected to the backend API in the future
 */
export const deleteCalendarEvent = async (data: DeleteCalendarEventData): Promise<void> => {
  // TODO: Connect to backend API to delete event through provider
  // This is a placeholder that logs the data for now

  console.log('Deleting calendar event:', {
    eventId: data.eventId,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/calendar/events/${data.eventId}`, {
  //   method: 'DELETE',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to delete calendar event')
};

export interface UpdateCalendarEventData {
  eventId: string;
  summary?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  description?: string;
  location?: string;
}

/**
 * Update a calendar event through the provider
 * This will be connected to the backend API in the future
 */
export const updateCalendarEvent = async (data: UpdateCalendarEventData): Promise<void> => {
  // TODO: Connect to backend API to update event through provider
  // This is a placeholder that logs the data for now

  console.log('Updating calendar event:', {
    eventId: data.eventId,
    summary: data.summary,
    start: data.start,
    end: data.end,
    description: data.description,
    location: data.location,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch(`/api/calendar/events/${data.eventId}`, {
  //   method: 'PATCH',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // })
  // if (!response.ok) throw new Error('Failed to update calendar event')
};

export interface SendAppointmentInfoData {
  emails: string[];
  subject: string;
  message?: string;
  eventId: string;
}

/**
 * Send appointment information via email
 * This will be connected to the backend API in the future
 */
export const sendAppointmentInfo = async (data: SendAppointmentInfoData): Promise<void> => {
  // TODO: Connect to backend API to send email
  // This is a placeholder that logs the data for now

  console.log('Sending appointment info:', {
    emails: data.emails,
    subject: data.subject,
    message: data.message || '(no message)',
    eventId: data.eventId,
  });

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/calendar/send-appointment-info', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // })
  // if (!response.ok) throw new Error('Failed to send appointment info')
};


