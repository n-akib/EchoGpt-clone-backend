import { ProviderType } from '../enums/provider-type.enum';

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PromptOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface PromptResponse {
  content: string;
  model: string;
  provider: ProviderType;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface HealthCheckResult {
  provider: ProviderType;
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
  error?: string;
  timestamp: Date;
}

export interface AiProviderStrategy {
  readonly type: ProviderType;
  sendPrompt(
    apiKey: string,
    messages: PromptMessage[],
    options?: PromptOptions,
    baseUrl?: string,
  ): Promise<PromptResponse>;
  healthCheck(apiKey: string, baseUrl?: string): Promise<HealthCheckResult>;
}
