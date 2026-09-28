import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiProvider } from './entities/ai-provider.entity';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { EncryptionService } from './services/encryption.service';
import { ProviderStrategyFactory } from './strategies/provider-strategy.factory';
import { OpenAiStrategy } from './strategies/openai.strategy';
import { AnthropicStrategy } from './strategies/anthropic.strategy';
import { GeminiStrategy } from './strategies/gemini.strategy';

@Module({
  imports: [TypeOrmModule.forFeature([AiProvider])],
  controllers: [ProvidersController],
  providers: [
    ProvidersService,
    EncryptionService,
    ProviderStrategyFactory,
    OpenAiStrategy,
    AnthropicStrategy,
    GeminiStrategy,
  ],
  exports: [ProvidersService, EncryptionService, ProviderStrategyFactory],
})
export class ProvidersModule {}
