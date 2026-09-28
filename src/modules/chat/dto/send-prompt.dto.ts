import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class SendPromptDto {
  @ApiProperty({
    example: 'Explain how Node.js event loop works in 3 bullet points.',
    description: 'User prompt or message content to send to the AI',
  })
  @IsString()
  @IsNotEmpty({ message: 'Prompt message cannot be empty' })
  message: string;

  @ApiPropertyOptional({
    example: 'd3b07384-d113-4607-b222-421715ff28b5',
    description: 'Conversation ID to continue. If omitted, a new conversation will be created.',
  })
  @IsUUID('4', { message: 'conversationId must be a valid UUID' })
  @IsOptional()
  conversationId?: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    description: 'Specific AI provider ID. If omitted, the default active provider will be used.',
  })
  @IsUUID('4', { message: 'providerId must be a valid UUID' })
  @IsOptional()
  providerId?: string;

  @ApiPropertyOptional({
    example: 'gpt-4o-mini',
    description: 'Specific model to use. If omitted, the provider default model will be used.',
  })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({
    example: 'You are an expert software engineer and teacher.',
    description: 'Custom system instruction/prompt for this interaction.',
  })
  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @ApiPropertyOptional({
    example: 0.7,
    description: 'Sampling temperature between 0 and 2',
    minimum: 0,
    maximum: 2,
  })
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number;
}
