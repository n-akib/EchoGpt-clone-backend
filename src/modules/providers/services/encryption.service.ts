import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const rawKey = this.configService.get<string>(
      'ENCRYPTION_KEY',
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    );

    if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
      this.key = Buffer.from(rawKey, 'hex');
    } else {
      this.key = crypto.scryptSync(rawKey, 'echogpt-salt', 32);
    }
  }

  encrypt(plainText: string): { ciphertext: string; iv: string; tag: string } {
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag().toString('hex');

      return {
        ciphertext: encrypted,
        iv: iv.toString('hex'),
        tag,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Encryption failed: ${error.message}`,
      );
    }
  }

  decrypt(ciphertext: string, ivHex: string, tagHex: string): string {
    try {
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

      decipher.setAuthTag(tag);

      let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new InternalServerErrorException(
        `Decryption failed: invalid key, ciphertext or tampered tag (${error.message})`,
      );
    }
  }

  maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length <= 8) {
      return '****';
    }
    const prefix = apiKey.slice(0, 4);
    const suffix = apiKey.slice(-4);
    return `${prefix}...${suffix}`;
  }
}
