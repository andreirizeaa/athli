/**
 * Calendar service for coach
 * This will be connected to the backend in the future
 */

export interface DeleteCalendarEventData {
  eventId: string;
}

export interface UpdateCalendarEventData {
  eventId: string;
  title?: string;
  start?: Date;
  end?: Date;
  description?: string;
  clientId?: string;
}

export interface SendAppointmentInfoData {
  eventId: string;
  emails?: string[];
  subject?: string;
  message?: string;
  clientId?: string;
}

/**
 * Delete a calendar event
 */
export const deleteCalendarEvent = async (data: DeleteCalendarEventData): Promise<void> => {
  console.log('Deleting calendar event:', data);
  await new Promise((resolve) => setTimeout(resolve, 100));
};

/**
 * Update a calendar event
 */
export const updateCalendarEvent = async (data: UpdateCalendarEventData): Promise<void> => {
  console.log('Updating calendar event:', data);
  await new Promise((resolve) => setTimeout(resolve, 100));
};

/**
 * Send appointment info to client
 */
export const sendAppointmentInfo = async (data: SendAppointmentInfoData): Promise<void> => {
  console.log('Sending appointment info:', data);
  await new Promise((resolve) => setTimeout(resolve, 100));
};
