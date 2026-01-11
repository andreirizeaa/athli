/**
 * Client types
 * Centralized from services/client-service.ts
 */

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  age: number;
  gender: 'male' | 'female' | 'prefer-not-to-say';
  type: 'online' | 'in-person' | 'hybrid';
  email: string;
  phone: string;
  country: string;
}

export interface AddClientData {
  firstName: string;
  lastName: string;
  email: string;
  type: 'online' | 'in-person' | 'hybrid';
}

export interface UpdateClientData {
  firstName: string;
  lastName: string;
  email: string;
  type: 'online' | 'in-person' | 'hybrid';
}
