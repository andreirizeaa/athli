/**
 * Service methods for settings operations
 * These will be connected to the backend in the future
 */

export type NotificationSettings = {
  newClientSignup: boolean;
  clientActivity: boolean;
  clientMessages: boolean;
  preAppointmentInformation: boolean;
  systemDowntimes: boolean;
  newFeatures: boolean;
};

export type CompanyDetails = {
  companyName: string;
  website: string;
  linkedin: string;
  location: string;
  specialities: string[];
  logo?: string; // base64 encoded image
};

/**
 * Update notification settings
 * @param notifications - The notification settings to update
 * @returns Promise<void>
 */
export const updateNotifications = async (notifications: NotificationSettings): Promise<void> => {
  // TODO: Connect to backend API
  // For now, this is a placeholder that will be implemented when backend is ready
  return Promise.resolve();
};

/**
 * Update company details
 * @param details - The company details to update
 * @returns Promise<void>
 */
export const updateCompanyDetails = async (details: CompanyDetails): Promise<void> => {
  // TODO: Connect to backend API
  // For now, this is a placeholder that will be implemented when backend is ready
  return Promise.resolve();
};

