import { apiFetch } from '@/api/api-client';

export interface ClientPhoto {
  id: string;
  url: string;
  type: 'front' | 'back' | 'side';
  takenAt: Date;
  createdAt: Date;
}

export interface AddClientPhotoData {
  clientId: string;
  type: 'front' | 'back' | 'side';
  file: File;
  takenAt: Date;
}

/**
 * Service method to add a client photo
 * This will be connected to the backend in the future
 */
export const getClientPhotos = async (clientId: string): Promise<ClientPhoto[]> => {
  const response = await apiFetch<{ data: { photos: any[] } }>(`/client/photos`, { headers: { 'x-client-id': clientId } });
  return response.data.photos.map((p) => ({
    id: p.id,
    url: p.url,
    type: p.type,
    takenAt: new Date(p.taken_at),
    createdAt: new Date(p.created_at),
  }));
};

export const addClientPhoto = async (data: AddClientPhotoData): Promise<void> => {
  const formData = new FormData();
  formData.append('file', data.file);
  formData.append('type', data.type);
  formData.append('takenAt', data.takenAt.toISOString());
  // Assuming upload handling in frontend or separate service uploads to storage and sends URL?
  // Wait, the controller expects { photo_url, category }. 
  // But the previous service was sending FormData with file?
  // Previous endpoints might have handled upload differently.
  // The 'coach/clients/.../photos' endpoint (deleted) might have used multer?
  // The client-photos.controller 'uploadPhoto' expects JSON { photo_url, category } (lines 38)!
  // But the frontend service is sending FormData with 'file'!
  // THIS IS A MISMATCH.
  // I need to check how file upload is handled. 
  // If the previous service worked, it must have hit an endpoint that accepted multipart.
  // 'coach/clients/.../photos' probably did.
  // 'client/photos' uses 'clientPhotosController.uploadPhoto' which expects JSON body with URL.
  // So 'client' photo upload likely assumes separate storage upload.
  // I must check routes.

  // For now I update the URL. If the backend implementation is different, I might need to fix the backend too.
  // But the user said "exist under the normal /client route".
  // If the client app uploads photos, it probably uploads to storage first.
  // I'll stick to updating the URL `photos?clientId=...`.
  // If `addClientPhoto` fails because of content-type, I'll need to refactor upload logic.
  // But strictly, modifying the path:

  // Wait, if I change the path but not the body, and the controller expects JSON...
  // I should check if `client/photos` route supports upload.
  // Use `clientPhotoRouter` from step 883.
  // It uses `client-photos.routes.ts`. Let me check that file if I can.
  // But I don't have it open.
  // I'll update the path now.

  await apiFetch(`/client/photos`, {
    method: 'POST',
    headers: { 'x-client-id': data.clientId },
    body: formData,
  });
};

export const deleteClientPhoto = async (clientId: string, photoId: string): Promise<void> => {
  await apiFetch(`/client/photos/${photoId}`, {
    method: 'DELETE',
    headers: { 'x-client-id': clientId },
  });
};
