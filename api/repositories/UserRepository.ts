import bcrypt from 'bcryptjs';
import { getDb, persistDb } from '../config/database.js';
import type { User } from '../../shared/types.js';

export interface DbUser extends User {
  password: string;
}

export class UserRepository {
  async findByUsername(username: string): Promise<DbUser | null> {
    const db = getDb();
    const user = db.users.find(u => u.username === username) as DbUser | undefined;
    return user || null;
  }

  async findById(id: string): Promise<User | null> {
    const db = getDb();
    const user = db.users.find(u => u.id === id);
    if (!user) return null;
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async verifyPassword(user: DbUser, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const db = getDb();
    const index = db.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    db.users[index] = { ...db.users[index], ...data, updatedAt: new Date().toISOString() };
    persistDb(db);
    
    const { password, ...userWithoutPassword } = db.users[index];
    return userWithoutPassword;
  }

  async findAll(): Promise<User[]> {
    const db = getDb();
    return db.users.map(({ password, ...user }) => user);
  }

  toPublicUser(dbUser: DbUser): Omit<User, 'password'> {
    const { password, ...user } = dbUser;
    return user;
  }
}
