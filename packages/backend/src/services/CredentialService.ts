import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.js';
import { Credential } from '../entities/Credential.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import axios from 'axios';

export class CredentialService {
  private credentialRepository: Repository<Credential>;

  constructor() {
    this.credentialRepository = AppDataSource.getRepository(Credential);
  }

  async create(
    userId: string,
    name: string,
    type: string,
    data: Record<string, unknown>
  ): Promise<Credential> {
    const encryptedData = encrypt(JSON.stringify(data));

    const credential = this.credentialRepository.create({
      userId,
      name,
      type,
      data: encryptedData,
      isActive: true,
    });

    return await this.credentialRepository.save(credential);
  }

  async list(userId: string, typeFilter?: string): Promise<Credential[]> {
    const where: any = { userId };
    if (typeFilter) {
      where.type = typeFilter;
    }

    return await this.credentialRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async getById(credentialId: string, userId: string): Promise<Credential | null> {
    return await this.credentialRepository.findOne({
      where: { id: credentialId, userId },
    });
  }

  async getDecrypted(credentialId: string, userId: string): Promise<Record<string, unknown>> {
    const credential = await this.getById(credentialId, userId);
    
    if (!credential) {
      throw new Error('Credential not found');
    }

    const decryptedData = decrypt(credential.data);
    return JSON.parse(decryptedData);
  }

  async update(
    credentialId: string,
    userId: string,
    updates: { name?: string; data?: Record<string, unknown> }
  ): Promise<Credential> {
    const credential = await this.getById(credentialId, userId);

    if (!credential) {
      throw new Error('Credential not found');
    }

    if (updates.name) {
      credential.name = updates.name;
    }

    if (updates.data) {
      credential.data = encrypt(JSON.stringify(updates.data));
    }

    return await this.credentialRepository.save(credential);
  }

  async delete(credentialId: string, userId: string): Promise<void> {
    const credential = await this.getById(credentialId, userId);

    if (!credential) {
      throw new Error('Credential not found');
    }

    await this.credentialRepository.remove(credential);
  }

  async test(credentialId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const credential = await this.getById(credentialId, userId);

      if (!credential) {
        throw new Error('Credential not found');
      }

      const decryptedData = await this.getDecrypted(credentialId, userId);

      // Test credential based on type
      switch (credential.type) {
        case 'httpBasicAuth': {
          // Test HTTP Basic Auth by making a test request
          const username = decryptedData.username as string;
          const password = decryptedData.password as string;
          if (!username || !password) {
            return { success: false, message: 'Missing username or password' };
          }
          // For MVP, just validate structure
          return { success: true, message: 'Credential structure is valid' };
        }

        case 'httpBearerToken': {
          const token = decryptedData.token as string;
          if (!token) {
            return { success: false, message: 'Missing token' };
          }
          return { success: true, message: 'Credential structure is valid' };
        }

        case 'slackOAuth2Api': {
          const slackToken = decryptedData.token as string;
          if (!slackToken) {
            return { success: false, message: 'Missing Slack token' };
          }
          // Test Slack API connection
          try {
            const response = await axios.get('https://slack.com/api/auth.test', {
              headers: { Authorization: `Bearer ${slackToken}` },
            });
            if (response.data.ok) {
              return { success: true, message: 'Slack credential is valid' };
            }
            return { success: false, message: response.data.error || 'Invalid Slack token' };
          } catch (error: any) {
            return { success: false, message: error.message || 'Failed to verify Slack token' };
          }
        }

        case 'genericApiKey': {
          const apiKey = decryptedData.apiKey as string;
          if (!apiKey) {
            return { success: false, message: 'Missing API key' };
          }
          return { success: true, message: 'Credential structure is valid' };
        }

        default:
          return { success: false, message: `Unknown credential type: ${credential.type}` };
      }
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to test credential' };
    }
  }
}
