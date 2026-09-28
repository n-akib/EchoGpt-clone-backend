import { Injectable, NotFoundException } from '@nestjs/common';
import { ProviderType } from '../enums/provider-type.enum';
import { AiProviderStrategy } from '../interfaces/ai-provider.interface';
import { OpenAiStrategy } from './openai.strategy';
import { AnthropicStrategy } from './anthropic.strategy';
import { GeminiStrategy } from './gemini.strategy';

@Injectable()
export class ProviderStrategyFactory {
  private readonly strategies: Map<ProviderType, AiProviderStrategy> = new Map();

  constructor(
    private readonly openAiStrategy: OpenAiStrategy,
    private readonly anthropicStrategy: AnthropicStrategy,
    private readonly geminiStrategy: GeminiStrategy,
  ) {
    this.strategies.set(ProviderType.OPENAI, this.openAiStrategy);
    this.strategies.set(ProviderType.ANTHROPIC, this.anthropicStrategy);
    this.strategies.set(ProviderType.GEMINI, this.geminiStrategy);
  }

  getStrategy(type: ProviderType): AiProviderStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new NotFoundException(
        `AI Provider strategy not found for provider type "${type}"`,
      );
    }
    return strategy;
  }
}
