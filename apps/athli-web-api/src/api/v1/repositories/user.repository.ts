export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

export interface UserRepository {
  create(data: Omit<User, 'id' | 'createdAt'>): Promise<User>;
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
}

// In-memory implementation for now; replace with DB later.
const users: User[] = [];

export const inMemoryUserRepository: UserRepository = {
  async create(data) {
    const user: User = {
      id: (users.length + 1).toString(),
      createdAt: new Date(),
      ...data,
    };
    users.push(user);
    return user;
  },

  async findById(id) {
    return users.find((u) => u.id === id) ?? null;
  },

  async findAll() {
    return users;
  },
};

