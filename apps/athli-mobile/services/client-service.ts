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

/**
 * Service method to get all clients
 * This will be connected to the backend in the future
 */
export const getClients = async (): Promise<Client[]> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return mock data - in the future, this will come from the backend
  return mockClients;

  // In the future, this will make an actual API call:
  // const response = await fetch('/api/clients', {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // })
  // if (!response.ok) throw new Error('Failed to get clients')
  // return await response.json()
};

export interface AddClientData {
  firstName: string;
  lastName: string;
  email: string;
  type: 'online' | 'in-person' | 'hybrid';
}

/**
 * Service method to add a new client
 * This will be connected to the backend in the future
 */
export const addClient = async (data: AddClientData): Promise<Client> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Create new client - in the future, this will be saved to the backend
  const newClient: Client = {
    id: `mock-${Date.now()}`,
    firstName: data.firstName,
    lastName: data.lastName,
    fullName: `${data.firstName} ${data.lastName}`,
    email: data.email,
    type: data.type,
    age: 0, // Default values for required fields
    gender: 'prefer-not-to-say',
    phone: '',
    country: '',
  };

  // In a real implementation, this would be:
  // const response = await fetch('/api/clients', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // })
  // if (!response.ok) throw new Error('Failed to add client')
  // return await response.json()

  return newClient;
};

// Mock clients data based on web app's mock athletes
const mockClients: Client[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Smith',
    fullName: 'John Smith',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    age: 32,
    gender: 'male',
    type: 'in-person',
    email: 'john.smith@example.com',
    phone: '+1 (555) 123-4567',
    country: 'United States',
  },
  {
    id: '2',
    firstName: 'Sarah',
    lastName: 'Johnson',
    fullName: 'Sarah Johnson',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces',
    age: 28,
    gender: 'female',
    type: 'online',
    email: 'sarah.johnson@example.com',
    phone: '+1 (555) 234-5678',
    country: 'Canada',
  },
  {
    id: '3',
    firstName: 'Mike',
    lastName: 'Wilson',
    fullName: 'Mike Wilson',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=faces',
    age: 35,
    gender: 'male',
    type: 'in-person',
    email: 'mike.wilson@example.com',
    phone: '+44 20 7946 0958',
    country: 'United Kingdom',
  },
  {
    id: '4',
    firstName: 'Emily',
    lastName: 'Davis',
    fullName: 'Emily Davis',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces',
    age: 29,
    gender: 'female',
    type: 'online',
    email: 'emily.davis@example.com',
    phone: '+1 (555) 345-6789',
    country: 'United States',
  },
  {
    id: '5',
    firstName: 'David',
    lastName: 'Brown',
    fullName: 'David Brown',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=faces',
    age: 41,
    gender: 'male',
    type: 'hybrid',
    email: 'david.brown@example.com',
    phone: '+61 2 9374 4000',
    country: 'Australia',
  },
  {
    id: '6',
    firstName: 'Lisa',
    lastName: 'Anderson',
    fullName: 'Lisa Anderson',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces',
    age: 26,
    gender: 'female',
    type: 'online',
    email: 'lisa.anderson@example.com',
    phone: '+1 (555) 456-7890',
    country: 'United States',
  },
  {
    id: '7',
    firstName: 'Chris',
    lastName: 'Martinez',
    fullName: 'Chris Martinez',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
    age: 38,
    gender: 'male',
    type: 'in-person',
    email: 'chris.martinez@example.com',
    phone: '+34 91 123 4567',
    country: 'Spain',
  },
  {
    id: '8',
    firstName: 'Jessica',
    lastName: 'Taylor',
    fullName: 'Jessica Taylor',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
    age: 31,
    gender: 'female',
    type: 'online',
    email: 'jessica.taylor@example.com',
    phone: '+1 (555) 567-8901',
    country: 'Canada',
  },
  {
    id: '9',
    firstName: 'Robert',
    lastName: 'Lee',
    fullName: 'Robert Lee',
    avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&h=200&fit=crop&crop=faces',
    age: 34,
    gender: 'male',
    type: 'hybrid',
    email: 'robert.lee@example.com',
    phone: '+1 (555) 678-9012',
    country: 'United States',
  },
  {
    id: '10',
    firstName: 'Amanda',
    lastName: 'White',
    fullName: 'Amanda White',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&crop=faces',
    age: 27,
    gender: 'female',
    type: 'online',
    email: 'amanda.white@example.com',
    phone: '+44 20 7946 0959',
    country: 'United Kingdom',
  },
  {
    id: '11',
    firstName: 'Michael',
    lastName: 'Chen',
    fullName: 'Michael Chen',
    avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop&crop=faces',
    age: 30,
    gender: 'male',
    type: 'in-person',
    email: 'michael.chen@example.com',
    phone: '+86 10 1234 5678',
    country: 'China',
  },
  {
    id: '12',
    firstName: 'Sophie',
    lastName: 'Martin',
    fullName: 'Sophie Martin',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&crop=faces',
    age: 25,
    gender: 'female',
    type: 'online',
    email: 'sophie.martin@example.com',
    phone: '+33 1 23 45 67 89',
    country: 'France',
  },
  {
    id: '13',
    firstName: 'James',
    lastName: 'Thompson',
    fullName: 'James Thompson',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=faces',
    age: 39,
    gender: 'male',
    type: 'in-person',
    email: 'james.thompson@example.com',
    phone: '+1 (555) 789-0123',
    country: 'United States',
  },
  {
    id: '14',
    firstName: 'Emma',
    lastName: 'Garcia',
    fullName: 'Emma Garcia',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces',
    age: 28,
    gender: 'female',
    type: 'hybrid',
    email: 'emma.garcia@example.com',
    phone: '+34 91 234 5678',
    country: 'Spain',
  },
  {
    id: '15',
    firstName: 'Daniel',
    lastName: 'Rodriguez',
    fullName: 'Daniel Rodriguez',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    age: 33,
    gender: 'male',
    type: 'in-person',
    email: 'daniel.rodriguez@example.com',
    phone: '+1 (555) 890-1234',
    country: 'United States',
  },
];

