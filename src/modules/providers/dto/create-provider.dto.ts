import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ProviderType } from '../enums/provider-type.enum';

export class CreateProviderDto {
  @ApiProperty({ example: 'OpenAI Primary', description: 'Display name for provider' })
  @IsString()
  @IsNotEmpty({ message: 'Provider name is required' })
  name: string;

  @ApiProperty({ enum: ProviderType, example: ProviderType.OPENAI })
  @IsEnum(ProviderType, {
    message: 'Type must be one of: openai, anthropic, gemini',
  })
  @IsNotEmpty({ message: 'Provider type is required' })
  type: ProviderType;

  @ApiProperty({
    example: 'sk-proj-abc123...',
    description: 'Raw API key (will be encrypted with AES-256-GCM at rest)',
  })
  @IsString()
  @IsNotEmpty({ message: 'API key is required' })
  apiKey: string;

  @ApiPropertyOptional({
    example: 'https://api.openai.com/v1',
    description: 'Custom base URL if using a proxy or enterprise endpoint',
  })
  @IsString()
  @IsOptional()
  baseUrl?: string;

  @ApiProperty({
    type: [String],
    example: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    description: 'Supported model identifiers',
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ message: 'At least one model must be specified' })
  models: string[];

  @ApiProperty({ example: 'gpt-4o-mini', description: 'Default model for this provider' })
  @IsString()
  @IsNotEmpty({ message: 'Default model is required' })
  defaultModel: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
