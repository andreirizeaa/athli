import type { UserRepository } from '../repositories/user.repository';

export class UserService {
  constructor(private readonly repo: UserRepository) {}

  createUser(input: {
    email: string;
    name: string;
    role: 'user' | 'admin';
  }) {
    return this.repo.create(input);
  }

  listUsers() {
    return this.repo.findAll();
  }

  getUser(id: string) {
    return this.repo.findById(id);
  }
}

