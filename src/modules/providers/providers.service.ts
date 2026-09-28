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
