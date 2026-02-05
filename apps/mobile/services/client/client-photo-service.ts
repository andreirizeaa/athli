import { apiFetch } from '@/lib/api-client';

/**
 * Client photo service for progress photos
 * Mirrors apps/web/api/client/client-photo-service.ts
 */

export interface ClientPhoto {
  id: string;
  url: string;
  type: 'front' | 'back' | 'side';
  recordedAt: Date;
  createdAt: Date;
}

export interface AddClientPhotosData {
  clientId: string;
  coachId: string;
  frontUri?: string | null;
  sideUri?: string | null;
  backUri?: string | null;
  recordedAt: Date;
}

export interface CheckExistingPhotosParams {
  clientId: string;
  coachId: string;
  date: Date;
}

export interface CheckExistingPhotosResult {
  exists: boolean;
  angles: ('front' | 'side' | 'back')[];
  date?: string;
}

/**
 * Get all progress photos for a client
 */
export const getClientPhotos = async (clientId: string, coachId: string): Promise<ClientPhoto[]> => {
  const response = await apiFetch<{ success: boolean; data: { photos: any[] } }>('/client/photos', {
    headers: {
      'x-client-id': clientId,
      'x-coach-id': coachId,
    },
  });

  // Flatten the log entries into individual photo items
  const flattenedPhotos: ClientPhoto[] = [];

  response.data.photos.forEach((log) => {
    const common = {
      recordedAt: new Date(log.date),
      createdAt: new Date(log.created_at),
    };

    if (log.front_photo_url) {
      flattenedPhotos.push({
        id: `${log.id}-front`,
        url: log.front_photo_url,
        type: 'front',
        ...common,
      });
    }
    if (log.side_photo_url) {
      flattenedPhotos.push({
        id: `${log.id}-side`,
        url: log.side_photo_url,
        type: 'side',
        ...common,
      });
    }
    if (log.back_photo_url) {
      flattenedPhotos.push({
        id: `${log.id}-back`,
        url: log.back_photo_url,
        type: 'back',
        ...common,
      });
    }
  });

  return flattenedPhotos;
};

/**
 * Add progress photos for a client
 * Note: For mobile, we use URIs instead of File objects
 */
export const addClientPhotos = async (data: AddClientPhotosData): Promise<void> => {
  const formData = new FormData();

  if (data.frontUri) {
    const frontFile = {
      uri: data.frontUri,
      type: 'image/jpeg',
      name: 'front.jpg',
    };
    formData.append('front', frontFile as any);
  }
  if (data.sideUri) {
    const sideFile = {
      uri: data.sideUri,
      type: 'image/jpeg',
      name: 'side.jpg',
    };
    formData.append('side', sideFile as any);
  }
  if (data.backUri) {
    const backFile = {
      uri: data.backUri,
      type: 'image/jpeg',
      name: 'back.jpg',
    };
    formData.append('back', backFile as any);
  }

  formData.append('date', data.recordedAt.toISOString().split('T')[0]);

  await apiFetch('/client/photos', {
    method: 'POST',
    headers: {
      'x-client-id': data.clientId,
      'x-coach-id': data.coachId,
    },
    body: formData as any,
  });
};

/**
 * Delete a client photo (entire log entry)
 */
export const deleteClientPhoto = async (
  clientId: string,
  coachId: string,
  photoId: string
): Promise<void> => {
  // Extract the original log ID from the flattened ID (e.g. UUID-front -> UUID)
  const lastHyphenIndex = photoId.lastIndexOf('-');
  const logId = lastHyphenIndex !== -1 ? photoId.substring(0, lastHyphenIndex) : photoId;

  await apiFetch(`/client/photos/${logId}`, {
    method: 'DELETE',
    headers: {
      'x-client-id': clientId,
      'x-coach-id': coachId,
    },
  });
};

/**
 * Delete a specific angle from a client photo
 */
export const deleteClientPhotoAngle = async (
  clientId: string,
  coachId: string,
  photoId: string,
  angle: 'front' | 'back' | 'side'
): Promise<void> => {
  // Extract the original log ID from the flattened ID
  const lastHyphenIndex = photoId.lastIndexOf('-');
  const logId = lastHyphenIndex !== -1 ? photoId.substring(0, lastHyphenIndex) : photoId;

  await apiFetch(`/client/photos/${logId}/${angle}`, {
    method: 'DELETE',
    headers: {
      'x-client-id': clientId,
      'x-coach-id': coachId,
    },
  });
};

/**
 * Check if photos exist for a specific date
 */
export const checkExistingPhotos = async (
  params: CheckExistingPhotosParams
): Promise<CheckExistingPhotosResult> => {
  const response = await apiFetch<{ success: boolean; data: CheckExistingPhotosResult }>(
    '/client/photos/check',
    {
      method: 'POST',
      headers: {
        'x-client-id': params.clientId,
        'x-coach-id': params.coachId,
      },
      body: JSON.stringify({
        date: params.date.toISOString().split('T')[0],
      }),
    }
  );

  return response.data;
};
