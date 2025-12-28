import { apiFetch } from '@/api/api-client';

export interface ClientPhoto {
  id: string;
  url: string;
  type: 'front' | 'back' | 'side';
  recordedAt: Date;
  createdAt: Date;
}

export interface AddClientPhotosData {
  clientId: string;
  frontFile?: File | null;
  sideFile?: File | null;
  backFile?: File | null;
  recordedAt: Date;
}

/**
 * Service method to get all progress photos for a client
 */
export const getClientPhotos = async (clientId: string): Promise<ClientPhoto[]> => {
  const response = await apiFetch<{ data: { photos: any[] } }>(`/client/photos`, { headers: { 'x-client-id': clientId } });

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

export const addClientPhotos = async (data: AddClientPhotosData): Promise<void> => {
  const formData = new FormData();
  if (data.frontFile) formData.append('front', data.frontFile);
  if (data.sideFile) formData.append('side', data.sideFile);
  if (data.backFile) formData.append('back', data.backFile);

  formData.append('date', data.recordedAt.toISOString().split('T')[0]);

  await apiFetch(`/client/photos`, {
    method: 'POST',
    headers: { 'x-client-id': data.clientId },
    body: formData,
  });
};

export const deleteClientPhoto = async (clientId: string, photoId: string): Promise<void> => {
  // Extract the original log ID from the flattened ID (e.g. UUID-front -> UUID)
  // Split from the end to preserve UUID hyphens (UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  const lastHyphenIndex = photoId.lastIndexOf('-');
  const logId = lastHyphenIndex !== -1 ? photoId.substring(0, lastHyphenIndex) : photoId;

  await apiFetch(`/client/photos/${logId}`, {
    method: 'DELETE',
    headers: { 'x-client-id': clientId },
  });
};

export const deleteClientPhotoAngle = async (
  clientId: string,
  photoId: string,
  angle: 'front' | 'back' | 'side'
): Promise<void> => {
  // Extract the original log ID from the flattened ID (e.g. UUID-front -> UUID)
  // Split from the end to preserve UUID hyphens (UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  const lastHyphenIndex = photoId.lastIndexOf('-');
  const logId = lastHyphenIndex !== -1 ? photoId.substring(0, lastHyphenIndex) : photoId;

  await apiFetch(`/client/photos/${logId}/${angle}`, {
    method: 'DELETE',
    headers: { 'x-client-id': clientId },
  });
};

export interface CheckExistingPhotosParams {
  clientId: string;
  date: Date;
}

export interface CheckExistingPhotosResult {
  exists: boolean;
  angles: ('front' | 'side' | 'back')[];
  date?: string;
}

export const checkExistingPhotos = async (params: CheckExistingPhotosParams): Promise<CheckExistingPhotosResult> => {
  const response = await apiFetch<{ data: CheckExistingPhotosResult }>(`/client/photos/check`, {
    method: 'POST',
    headers: { 'x-client-id': params.clientId },
    body: JSON.stringify({
      date: params.date.toISOString().split('T')[0],
    }),
  });

  return response.data;
};
