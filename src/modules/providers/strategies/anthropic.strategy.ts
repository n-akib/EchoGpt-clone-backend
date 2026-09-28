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
export class AnthropicStrategy implements AiProviderStrategy {
  readonly type = ProviderType.ANTHROPIC;

  async sendPrompt(
    apiKey: string,
    messages: PromptMessage[],
    options?: PromptOptions,
    baseUrl = 'https://api.anthropic.com/v1',
  ): Promise<PromptResponse> {
    const model = options?.model || 'claude-3-5-sonnet-20241022';

    // Separate system messages for Anthropic API
    const systemMessages = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature ?? 0.7,
        system: systemMessages || undefined,
        messages: conversationMessages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const content =
      data.content
        ?.filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('') || '';

    return {
      content,
      model: data.model || model,
      provider: ProviderType.ANTHROPIC,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens:
              (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
          }
        : undefined,
    };
  }

  async healthCheck(
    apiKey: string,
    baseUrl = 'https://api.anthropic.com/v1',
  ): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      // Light test message with 1 token output
      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const errorText = await response.text();
        return {
          provider: ProviderType.ANTHROPIC,
          status: 'unhealthy',
          latencyMs,
          error: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
          timestamp: new Date(),
        };
      }

      return {
        provider: ProviderType.ANTHROPIC,
        status: 'healthy',
        latencyMs,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        provider: ProviderType.ANTHROPIC,
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }
}
