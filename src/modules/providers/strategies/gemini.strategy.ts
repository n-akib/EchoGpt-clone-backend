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
export class GeminiStrategy implements AiProviderStrategy {
  readonly type = ProviderType.GEMINI;

  async sendPrompt(
    apiKey: string,
    messages: PromptMessage[],
    options?: PromptOptions,
    baseUrl = 'https://generativelanguage.googleapis.com/v1beta',
  ): Promise<PromptResponse> {
    const model = options?.model || 'gemini-1.5-flash';

    // Format messages into Gemini contents format
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find((m) => m.role === 'system');

    const bodyPayload: any = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens,
      },
    };

    if (systemInstruction) {
      bodyPayload.systemInstruction = {
        parts: [{ text: systemInstruction.content }],
      };
    }

    const response = await fetch(
      `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const content =
      candidate?.content?.parts?.map((p: any) => p.text).join('') || '';

    return {
      content,
      model,
      provider: ProviderType.GEMINI,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
  }

  async healthCheck(
    apiKey: string,
    baseUrl = 'https://generativelanguage.googleapis.com/v1beta',
  ): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${baseUrl}/models?key=${apiKey}`, {
        method: 'GET',
      });

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const errorText = await response.text();
        return {
          provider: ProviderType.GEMINI,
          status: 'unhealthy',
          latencyMs,
          error: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
          timestamp: new Date(),
        };
      }

      return {
        provider: ProviderType.GEMINI,
        status: 'healthy',
        latencyMs,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        provider: ProviderType.GEMINI,
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }
}
