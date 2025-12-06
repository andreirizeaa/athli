import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { inMemoryUserRepository } from '../repositories/user.repository';

const userService = new UserService(inMemoryUserRepository);

export async function createUserController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function listUsersController(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const users = await userService.listUsers();
    res.json({ data: users });
  } catch (err) {
    next(err);
  }
}

