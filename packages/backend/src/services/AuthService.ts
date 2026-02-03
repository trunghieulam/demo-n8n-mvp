import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export class AuthService {
  private get userRepository(): Repository<User> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Database not initialized');
    }
    return AppDataSource.getRepository(User);
  }

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<User> {
    // Normalize email (trim and lowercase for consistency)
    const normalizedEmail = email.trim().toLowerCase();
    
    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      email: normalizedEmail,
      password: hashedPassword,
      firstName,
      lastName,
      isActive: true,
    });

    return await this.userRepository.save(user);
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    // Normalize email (trim and lowercase for consistency)
    const normalizedEmail = email.trim().toLowerCase();
    
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      console.error(`[AuthService] Login failed: User not found for email: ${normalizedEmail}`);
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      console.error(`[AuthService] Login failed: User account is inactive for email: ${normalizedEmail}`);
      throw new Error('User account is inactive');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      console.error(`[AuthService] Login failed: Invalid password for email: ${normalizedEmail}`);
      throw new Error('Invalid email or password');
    }
    
    console.log(`[AuthService] Login successful for email: ${normalizedEmail}`);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword as User,
      token,
    };
  }

  async verifyToken(token: string): Promise<{ userId: string; email: string }> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'firstName', 'lastName', 'isActive', 'createdAt', 'updatedAt'],
    });
  }
}
