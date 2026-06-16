import { UserRepository } from '../repositories/UserRepository.js';
import { generateToken } from '../middleware/auth.js';
import type { User } from '../../shared/types.js';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async login(username: string, password: string): Promise<{ token: string; user: Omit<User, 'password'> } | null> {
    const dbUser = await this.userRepository.findByUsername(username);
    
    if (!dbUser) {
      return null;
    }

    const isValid = await this.userRepository.verifyPassword(dbUser, password);
    
    if (!isValid) {
      return null;
    }

    const user = this.userRepository.toPublicUser(dbUser);
    const token = generateToken(user);

    return { token, user };
  }

  async getCurrentUser(userId: string): Promise<Omit<User, 'password'> | null> {
    return this.userRepository.findById(userId);
  }
}
