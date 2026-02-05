/**
 * Client service - now uses real API via coach-client-service
 * This file re-exports from coach-client-service for backward compatibility
 */
export { getClients, addClient, updateClient, archiveClient, deleteClient } from './coach/coach-client-service';
export type { Athlete as Client, AddClientData, UpdateClientData } from './coach/coach-client-service';
