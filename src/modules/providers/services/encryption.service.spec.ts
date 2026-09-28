import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockReturnValue(
                '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
              ),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt a plaintext string and decrypt it back successfully', () => {
      const plainText = 'sk-proj-live-api-key-secret-1234567890';
      const encrypted = service.encrypt(plainText);

      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      expect(encrypted.ciphertext).not.toEqual(plainText);

      const decrypted = service.decrypt(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.tag,
      );

      expect(decrypted).toEqual(plainText);
    });

    it('should produce different ciphertexts and IVs for identical plaintexts (IV randomness)', () => {
      const plainText = 'constant-api-key';
      const enc1 = service.encrypt(plainText);
      const enc2 = service.encrypt(plainText);

      expect(enc1.iv).not.toEqual(enc2.iv);
      expect(enc1.ciphertext).not.toEqual(enc2.ciphertext);

      expect(service.decrypt(enc1.ciphertext, enc1.iv, enc1.tag)).toEqual(plainText);
      expect(service.decrypt(enc2.ciphertext, enc2.iv, enc2.tag)).toEqual(plainText);
    });

    it('should throw InternalServerErrorException when auth tag is tampered with', () => {
      const plainText = 'secret-data';
      const enc = service.encrypt(plainText);

      const tamperedTag = '0'.repeat(32);

      expect(() =>
        service.decrypt(enc.ciphertext, enc.iv, tamperedTag),
      ).toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when ciphertext is corrupted', () => {
      const plainText = 'secret-data';
      const enc = service.encrypt(plainText);

      const corruptedCiphertext = 'ff' + enc.ciphertext.slice(2);

      expect(() =>
        service.decrypt(corruptedCiphertext, enc.iv, enc.tag),
      ).toThrow(InternalServerErrorException);
    });
  });

  describe('maskApiKey', () => {
    it('should mask standard length API key showing first 4 and last 4 characters', () => {
      const key = 'sk-proj-1234567890abcdef';
      const masked = service.maskApiKey(key);

      expect(masked).toBe('sk-p...cdef');
    });

    it('should return **** for short or empty keys', () => {
      expect(service.maskApiKey('short')).toBe('****');
      expect(service.maskApiKey('')).toBe('****');
      expect(service.maskApiKey(null as any)).toBe('****');
    });
  });
});
