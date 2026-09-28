import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProvidersService } from './providers.service';
import { AiProvider } from './entities/ai-provider.entity';
import { ProviderType } from './enums/provider-type.enum';
import { EncryptionService } from './services/encryption.service';
import { ProviderStrategyFactory } from './strategies/provider-strategy.factory';
import { OpenAiStrategy } from './strategies/openai.strategy';
import { AnthropicStrategy } from './strategies/anthropic.strategy';
import { GeminiStrategy } from './strategies/gemini.strategy';

describe('ProvidersService', () => {
  let service: ProvidersService;
  let encryptionService: EncryptionService;
  let providerRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  const mockProvider: AiProvider = {
    id: 'prov-uuid-1',
    name: 'OpenAI Primary',
    type: ProviderType.OPENAI,
    apiKeyEncrypted: 'encrypted_hex',
    apiKeyIv: 'iv_hex',
    apiKeyTag: 'tag_hex',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini'],
    defaultModel: 'gpt-4o-mini',
    isEnabled: true,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
    };

    providerRepository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) =>
        Promise.resolve({ ...mockProvider, ...entity }),
      ),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvidersService,
        EncryptionService,
        ProviderStrategyFactory,
        OpenAiStrategy,
        AnthropicStrategy,
        GeminiStrategy,
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
        {
          provide: getRepositoryToken(AiProvider),
          useValue: providerRepository,
        },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  describe('create', () => {
    it('should encrypt API key, save provider, and return masked key', async () => {
      const createDto = {
        name: 'OpenAI Test',
        type: ProviderType.OPENAI,
        apiKey: 'sk-proj-testkey12345678',
        models: ['gpt-4o'],
        defaultModel: 'gpt-4o',
        isDefault: true,
      };

      const result = await service.create(createDto);

      expect(providerRepository.update).toHaveBeenCalledWith(
        { isDefault: true },
        { isDefault: false },
      );
      expect(providerRepository.save).toHaveBeenCalled();
      expect(result.name).toBe('OpenAI Test');
      expect(result.maskedApiKey).toContain('...');
      expect(result.maskedApiKey).not.toBe('sk-proj-testkey12345678');
    });
  });

  describe('findAll', () => {
    it('should return all providers with masked API keys', async () => {
      const qb = providerRepository.createQueryBuilder();
      qb.getMany.mockResolvedValue([mockProvider]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('prov-uuid-1');
      expect(result[0].maskedApiKey).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should return provider if found', async () => {
      const qb = providerRepository.createQueryBuilder();
      qb.getOne.mockResolvedValue(mockProvider);

      const result = await service.findById('prov-uuid-1');

      expect(result.id).toBe('prov-uuid-1');
      expect(result.type).toBe(ProviderType.OPENAI);
    });

    it('should throw NotFoundException if not found', async () => {
      const qb = providerRepository.createQueryBuilder();
      qb.getOne.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findEntityWithApiKey', () => {
    it('should decrypt API key and attach to returned entity', async () => {
      const originalKey = 'sk-proj-secret-key-1234';
      const enc = encryptionService.encrypt(originalKey);

      const qb = providerRepository.createQueryBuilder();
      qb.getOne.mockResolvedValue({
        ...mockProvider,
        apiKeyEncrypted: enc.ciphertext,
        apiKeyIv: enc.iv,
        apiKeyTag: enc.tag,
      });

      const result = await service.findEntityWithApiKey('prov-uuid-1');

      expect(result.decryptedApiKey).toBe(originalKey);
    });
  });

  describe('update', () => {
    it('should update name and re-encrypt new API key if provided', async () => {
      const qb = providerRepository.createQueryBuilder();
      qb.getOne.mockResolvedValue({ ...mockProvider });

      const result = await service.update('prov-uuid-1', {
        name: 'OpenAI Renamed',
        apiKey: 'sk-proj-brand-new-key-1234',
      });

      expect(providerRepository.save).toHaveBeenCalled();
      expect(result.name).toBe('OpenAI Renamed');
    });
  });

  describe('delete', () => {
    it('should delete existing provider', async () => {
      providerRepository.findOne.mockResolvedValue(mockProvider);

      const result = await service.delete('prov-uuid-1');

      expect(providerRepository.delete).toHaveBeenCalledWith('prov-uuid-1');
      expect(result.message).toBe('AI Provider deleted successfully');
    });

    it('should throw NotFoundException if provider to delete is not found', async () => {
      providerRepository.findOne.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleEnabled', () => {
    it('should toggle isEnabled status', async () => {
      providerRepository.findOne.mockResolvedValue({
        ...mockProvider,
        isEnabled: true,
      });

      const qb = providerRepository.createQueryBuilder();
      qb.getOne.mockResolvedValue({
        ...mockProvider,
        isEnabled: false,
      });

      const result = await service.toggleEnabled('prov-uuid-1', false);

      expect(providerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isEnabled: false }),
      );
      expect(result.isEnabled).toBe(false);
    });

    it('should throw NotFoundException if provider not found', async () => {
      providerRepository.findOne.mockResolvedValue(null);

      await expect(service.toggleEnabled('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setDefault', () => {
    it('should unset previous defaults and set target provider as default', async () => {
      providerRepository.findOne.mockResolvedValue({
        ...mockProvider,
        isEnabled: true,
        isDefault: false,
      });

      const qb = providerRepository.createQueryBuilder();
      qb.getOne.mockResolvedValue({
        ...mockProvider,
        isDefault: true,
      });

      const result = await service.setDefault('prov-uuid-1');

      expect(providerRepository.update).toHaveBeenCalledWith(
        { isDefault: true },
        { isDefault: false },
      );
      expect(providerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isDefault: true }),
      );
      expect(result.isDefault).toBe(true);
    });

    it('should throw BadRequestException if provider is disabled', async () => {
      providerRepository.findOne.mockResolvedValue({
        ...mockProvider,
        isEnabled: false,
      });

      await expect(service.setDefault('prov-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getDefault', () => {
    it('should return default enabled provider', async () => {
      providerRepository.findOne.mockResolvedValue({
        ...mockProvider,
        isDefault: true,
        isEnabled: true,
      });

      const qb = providerRepository.createQueryBuilder();
      qb.getOne.mockResolvedValue({
        ...mockProvider,
        isDefault: true,
      });

      const result = await service.getDefault();

      expect(result.id).toBe('prov-uuid-1');
      expect(result.isDefault).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('should run health check via strategy and return health result', async () => {
      const originalKey = 'sk-proj-secret-key-1234';
      const enc = encryptionService.encrypt(originalKey);

      const qb = providerRepository.createQueryBuilder();
      qb.getOne.mockResolvedValue({
        ...mockProvider,
        apiKeyEncrypted: enc.ciphertext,
        apiKeyIv: enc.iv,
        apiKeyTag: enc.tag,
      });

      const openAiStrategy = service.getStrategy(ProviderType.OPENAI);
      jest.spyOn(openAiStrategy, 'healthCheck').mockResolvedValue({
        provider: ProviderType.OPENAI,
        status: 'healthy',
        latencyMs: 85,
        timestamp: new Date(),
      });

      const result = await service.healthCheck('prov-uuid-1');

      expect(result.status).toBe('healthy');
      expect(result.latencyMs).toBe(85);
      expect(result.providerName).toBe('OpenAI Primary');
    });
  });

  describe('healthCheckAll', () => {
    it('should check health of all enabled providers', async () => {
      const originalKey = 'sk-proj-secret-key-1234';
      const enc = encryptionService.encrypt(originalKey);

      const qb = providerRepository.createQueryBuilder();
      qb.getMany.mockResolvedValue([
        {
          ...mockProvider,
          apiKeyEncrypted: enc.ciphertext,
          apiKeyIv: enc.iv,
          apiKeyTag: enc.tag,
        },
      ]);

      const openAiStrategy = service.getStrategy(ProviderType.OPENAI);
      jest.spyOn(openAiStrategy, 'healthCheck').mockResolvedValue({
        provider: ProviderType.OPENAI,
        status: 'healthy',
        latencyMs: 90,
        timestamp: new Date(),
      });

      const results = await service.healthCheckAll();

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('healthy');
    });
  });

  describe('getStrategy', () => {
    it('should return OpenAiStrategy for ProviderType.OPENAI', () => {
      const strategy = service.getStrategy(ProviderType.OPENAI);
      expect(strategy.type).toBe(ProviderType.OPENAI);
    });

    it('should return AnthropicStrategy for ProviderType.ANTHROPIC', () => {
      const strategy = service.getStrategy(ProviderType.ANTHROPIC);
      expect(strategy.type).toBe(ProviderType.ANTHROPIC);
    });

    it('should return GeminiStrategy for ProviderType.GEMINI', () => {
      const strategy = service.getStrategy(ProviderType.GEMINI);
      expect(strategy.type).toBe(ProviderType.GEMINI);
    });
  });
});
