import { Injectable } from '@nestjs/common';
import { ProviderType } from '../enums/provider-type.enum';
import {
  AiProviderStrategy,
  HealthCheckResult,
  PromptMessage,
  PromptOptions,
  PromptResponse,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class OpenAiStrategy implements AiProviderStrategy {
  readonly type = ProviderType.OPENAI;

  async sendPrompt(
    apiKey: string,
    messages: PromptMessage[],
    options?: PromptOptions,
    baseUrl = 'https://api.openai.com/v1',
  ): Promise<PromptResponse> {
    const model = options?.model || 'gpt-4o-mini';
    const startTime = Date.now();

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return {
      content,
      model: data.model || model,
      provider: ProviderType.OPENAI,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  async healthCheck(
    apiKey: string,
    baseUrl = 'https://api.openai.com/v1',
  ): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const errorText = await response.text();
        return {
          provider: ProviderType.OPENAI,
          status: 'unhealthy',
          latencyMs,
          error: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
          timestamp: new Date(),
        };
      }

      return {
        provider: ProviderType.OPENAI,
        status: 'healthy',
        latencyMs,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        provider: ProviderType.OPENAI,
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }
}
