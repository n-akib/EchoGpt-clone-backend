import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiProvider } from './entities/ai-provider.entity';
import { ProviderType } from './enums/provider-type.enum';
import { EncryptionService } from './services/encryption.service';
import { ProviderStrategyFactory } from './strategies/provider-strategy.factory';
import { AiProviderStrategy } from './interfaces/ai-provider.interface';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderResponseDto } from './dto/provider-response.dto';
import { HealthCheckResponseDto } from './dto/health-check-response.dto';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(AiProvider)
    private readonly providerRepository: Repository<AiProvider>,
    private readonly encryptionService: EncryptionService,
    private readonly strategyFactory: ProviderStrategyFactory,
  ) {}

  async create(createDto: CreateProviderDto): Promise<ProviderResponseDto> {
    // If setting as default, clear any existing default
    if (createDto.isDefault) {
      await this.providerRepository.update({ isDefault: true }, { isDefault: false });
    }

    const { ciphertext, iv, tag } = this.encryptionService.encrypt(createDto.apiKey);
    const maskedKey = this.encryptionService.maskApiKey(createDto.apiKey);

    const provider = this.providerRepository.create({
      name: createDto.name.trim(),
      type: createDto.type,
      apiKeyEncrypted: ciphertext,
      apiKeyIv: iv,
      apiKeyTag: tag,
      baseUrl: createDto.baseUrl ? createDto.baseUrl.trim() : null,
      models: createDto.models,
      defaultModel: createDto.defaultModel,
      isEnabled: createDto.isEnabled ?? true,
      isDefault: createDto.isDefault ?? false,
    });

    const saved = await this.providerRepository.save(provider);
    return this.mapToResponseDto(saved, maskedKey);
  }

  async findAll(): Promise<ProviderResponseDto[]> {
    const providers = await this.providerRepository
      .createQueryBuilder('provider')
      .addSelect(['provider.apiKeyEncrypted', 'provider.apiKeyIv', 'provider.apiKeyTag'])
      .orderBy('provider.createdAt', 'ASC')
      .getMany();

    return providers.map((p) => {
      let maskedKey = '****';
      try {
        const decrypted = this.encryptionService.decrypt(
          p.apiKeyEncrypted,
          p.apiKeyIv,
          p.apiKeyTag,
        );
        maskedKey = this.encryptionService.maskApiKey(decrypted);
      } catch {
        maskedKey = '****';
      }
      return this.mapToResponseDto(p, maskedKey);
    });
  }

  async findAllEnabled(): Promise<ProviderResponseDto[]> {
    const providers = await this.providerRepository
      .createQueryBuilder('provider')
      .addSelect(['provider.apiKeyEncrypted', 'provider.apiKeyIv', 'provider.apiKeyTag'])
      .where('provider.isEnabled = :isEnabled', { isEnabled: true })
      .orderBy('provider.isDefault', 'DESC')
      .addOrderBy('provider.createdAt', 'ASC')
      .getMany();

    return providers.map((p) => {
      let maskedKey = '****';
      try {
        const decrypted = this.encryptionService.decrypt(
          p.apiKeyEncrypted,
          p.apiKeyIv,
          p.apiKeyTag,
        );
        maskedKey = this.encryptionService.maskApiKey(decrypted);
      } catch {
        maskedKey = '****';
      }
      return this.mapToResponseDto(p, maskedKey);
    });
  }

  async findById(id: string): Promise<ProviderResponseDto> {
    const provider = await this.providerRepository
      .createQueryBuilder('provider')
      .addSelect(['provider.apiKeyEncrypted', 'provider.apiKeyIv', 'provider.apiKeyTag'])
      .where('provider.id = :id', { id })
      .getOne();

    if (!provider) {
      throw new NotFoundException(`AI Provider with ID "${id}" not found`);
    }

    let maskedKey = '****';
    try {
      const decrypted = this.encryptionService.decrypt(
        provider.apiKeyEncrypted,
        provider.apiKeyIv,
        provider.apiKeyTag,
      );
      maskedKey = this.encryptionService.maskApiKey(decrypted);
    } catch {
      maskedKey = '****';
    }

    return this.mapToResponseDto(provider, maskedKey);
  }

  async findEntityWithApiKey(
    id: string,
  ): Promise<AiProvider & { decryptedApiKey: string }> {
    const provider = await this.providerRepository
      .createQueryBuilder('provider')
      .addSelect(['provider.apiKeyEncrypted', 'provider.apiKeyIv', 'provider.apiKeyTag'])
      .where('provider.id = :id', { id })
      .getOne();

    if (!provider) {
      throw new NotFoundException(`AI Provider with ID "${id}" not found`);
    }

    const decrypted = this.encryptionService.decrypt(
      provider.apiKeyEncrypted,
      provider.apiKeyIv,
      provider.apiKeyTag,
    );

    return Object.assign(provider, { decryptedApiKey: decrypted });
  }

  async findDefaultProviderWithApiKey(): Promise<
    AiProvider & { decryptedApiKey: string }
  > {
    let provider = await this.providerRepository
      .createQueryBuilder('provider')
      .addSelect(['provider.apiKeyEncrypted', 'provider.apiKeyIv', 'provider.apiKeyTag'])
      .where('provider.isDefault = :isDefault AND provider.isEnabled = :isEnabled', {
        isDefault: true,
        isEnabled: true,
      })
      .getOne();

    if (!provider) {
      // Fallback to first enabled provider
      provider = await this.providerRepository
        .createQueryBuilder('provider')
        .addSelect(['provider.apiKeyEncrypted', 'provider.apiKeyIv', 'provider.apiKeyTag'])
        .where('provider.isEnabled = :isEnabled', { isEnabled: true })
        .orderBy('provider.createdAt', 'ASC')
        .getOne();
    }

    if (!provider) {
      throw new NotFoundException('No active AI providers configured');
    }

    const decrypted = this.encryptionService.decrypt(
      provider.apiKeyEncrypted,
      provider.apiKeyIv,
      provider.apiKeyTag,
    );

    return Object.assign(provider, { decryptedApiKey: decrypted });
  }

  async update(
    id: string,
    updateDto: UpdateProviderDto,
  ): Promise<ProviderResponseDto> {
    const provider = await this.providerRepository
      .createQueryBuilder('provider')
      .addSelect(['provider.apiKeyEncrypted', 'provider.apiKeyIv', 'provider.apiKeyTag'])
      .where('provider.id = :id', { id })
      .getOne();

    if (!provider) {
      throw new NotFoundException(`AI Provider with ID "${id}" not found`);
    }

    if (updateDto.isDefault) {
      await this.providerRepository.update({ isDefault: true }, { isDefault: false });
      provider.isDefault = true;
    } else if (updateDto.isDefault !== undefined) {
      provider.isDefault = updateDto.isDefault;
    }

    if (updateDto.name !== undefined) provider.name = updateDto.name.trim();
    if (updateDto.type !== undefined) provider.type = updateDto.type;
    if (updateDto.baseUrl !== undefined)
      provider.baseUrl = updateDto.baseUrl ? updateDto.baseUrl.trim() : null;
    if (updateDto.models !== undefined) provider.models = updateDto.models;
    if (updateDto.defaultModel !== undefined)
      provider.defaultModel = updateDto.defaultModel;
    if (updateDto.isEnabled !== undefined)
      provider.isEnabled = updateDto.isEnabled;

    let maskedKey = '****';
    if (updateDto.apiKey && updateDto.apiKey.trim().length > 0) {
      const { ciphertext, iv, tag } = this.encryptionService.encrypt(
        updateDto.apiKey.trim(),
      );
      provider.apiKeyEncrypted = ciphertext;
      provider.apiKeyIv = iv;
      provider.apiKeyTag = tag;
      maskedKey = this.encryptionService.maskApiKey(updateDto.apiKey.trim());
    } else {
      try {
        const decrypted = this.encryptionService.decrypt(
          provider.apiKeyEncrypted,
          provider.apiKeyIv,
          provider.apiKeyTag,
        );
        maskedKey = this.encryptionService.maskApiKey(decrypted);
      } catch {
        maskedKey = '****';
      }
    }

    const saved = await this.providerRepository.save(provider);
    return this.mapToResponseDto(saved, maskedKey);
  }

  async delete(id: string): Promise<{ message: string }> {
    const provider = await this.providerRepository.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`AI Provider with ID "${id}" not found`);
    }

    await this.providerRepository.delete(id);
    return { message: 'AI Provider deleted successfully' };
  }

  async toggleEnabled(
    id: string,
    isEnabled?: boolean,
  ): Promise<ProviderResponseDto> {
    const provider = await this.providerRepository.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`AI Provider with ID "${id}" not found`);
    }

    provider.isEnabled = isEnabled !== undefined ? isEnabled : !provider.isEnabled;

    // If disabled and was default, clear default
    if (!provider.isEnabled && provider.isDefault) {
      provider.isDefault = false;
    }

    const saved = await this.providerRepository.save(provider);
    return this.findById(saved.id);
  }

  async setDefault(id: string): Promise<ProviderResponseDto> {
    const provider = await this.providerRepository.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`AI Provider with ID "${id}" not found`);
    }

    if (!provider.isEnabled) {
      throw new BadRequestException('Cannot set a disabled provider as default');
    }

    // Unset all existing defaults
    await this.providerRepository.update({ isDefault: true }, { isDefault: false });

    provider.isDefault = true;
    const saved = await this.providerRepository.save(provider);
    return this.findById(saved.id);
  }

  async getDefault(): Promise<ProviderResponseDto> {
    const provider = await this.providerRepository.findOne({
      where: { isDefault: true, isEnabled: true },
    });

    if (!provider) {
      // Fallback to first enabled provider
      const fallback = await this.providerRepository.findOne({
        where: { isEnabled: true },
        order: { createdAt: 'ASC' },
      });

      if (!fallback) {
        throw new NotFoundException('No active AI providers available');
      }

      return this.findById(fallback.id);
    }

    return this.findById(provider.id);
  }

  async healthCheck(id: string): Promise<HealthCheckResponseDto> {
    const provider = await this.findEntityWithApiKey(id);
    const strategy = this.getStrategy(provider.type);

    const result = await strategy.healthCheck(
      provider.decryptedApiKey,
      provider.baseUrl || undefined,
    );

    return {
      providerId: provider.id,
      providerName: provider.name,
      type: provider.type,
      status: result.status,
      latencyMs: result.latencyMs,
      error: result.error,
      timestamp: result.timestamp,
    };
  }

  async healthCheckAll(): Promise<HealthCheckResponseDto[]> {
    const providers = await this.providerRepository
      .createQueryBuilder('provider')
      .addSelect(['provider.apiKeyEncrypted', 'provider.apiKeyIv', 'provider.apiKeyTag'])
      .where('provider.isEnabled = :isEnabled', { isEnabled: true })
      .getMany();

    const results = await Promise.all(
      providers.map(async (provider) => {
        try {
          const decryptedApiKey = this.encryptionService.decrypt(
            provider.apiKeyEncrypted,
            provider.apiKeyIv,
            provider.apiKeyTag,
          );
          const strategy = this.getStrategy(provider.type);
          const res = await strategy.healthCheck(
            decryptedApiKey,
            provider.baseUrl || undefined,
          );

          return {
            providerId: provider.id,
            providerName: provider.name,
            type: provider.type,
            status: res.status,
            latencyMs: res.latencyMs,
            error: res.error,
            timestamp: res.timestamp,
          };
        } catch (error) {
          return {
            providerId: provider.id,
            providerName: provider.name,
            type: provider.type,
            status: 'unhealthy' as const,
            latencyMs: 0,
            error: error.message,
            timestamp: new Date(),
          };
        }
      }),
    );

    return results;
  }

  getStrategy(type: ProviderType): AiProviderStrategy {
    return this.strategyFactory.getStrategy(type);
  }

  private mapToResponseDto(
    entity: AiProvider,
    maskedApiKey: string,
  ): ProviderResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      maskedApiKey,
      baseUrl: entity.baseUrl,
      models: entity.models || [],
      defaultModel: entity.defaultModel,
      isEnabled: entity.isEnabled,
      isDefault: entity.isDefault,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
