import 'reflect-metadata';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const userRepository = AppDataSource.getRepository(User);

    // Check if admin user exists
    const normalizedEmail = 'admin@example.com';
    const existingAdmin = await userRepository.findOne({
      where: { email: normalizedEmail },
    });

    const hashedPassword = await bcrypt.hash('p@ssw0rd', 10);

    if (existingAdmin) {
      // Update existing admin user password to ensure it's correct
      existingAdmin.password = hashedPassword;
      existingAdmin.isActive = true;
      await userRepository.save(existingAdmin);
    } else {
      // Create admin user
      const adminUser = userRepository.create({
        email: normalizedEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
      });

      await userRepository.save(adminUser);
    }

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
