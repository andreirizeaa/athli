// DTOs for user-related data transfer objects
// Can be used for request/response transformations if needed

export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string;
}

