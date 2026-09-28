import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderType } from '../enums/provider-type.enum';

export class ProviderResponseDto {
  @ApiProperty({ example: 'b3f54abc-1234-5678-9abc-def012345678' })
  id: string;

  @ApiProperty({ example: 'OpenAI Primary' })
  name: string;

  @ApiProperty({ enum: ProviderType, example: ProviderType.OPENAI })
  type: ProviderType;

  @ApiProperty({ example: 'sk-p...1234', description: 'Masked API key for safety' })
  maskedApiKey: string;

  @ApiPropertyOptional({ example: 'https://api.openai.com/v1', nullable: true })
  baseUrl: string | null;

  @ApiProperty({ type: [String], example: ['gpt-4o', 'gpt-4o-mini'] })
  models: string[];

  @ApiProperty({ example: 'gpt-4o-mini' })
  defaultModel: string;

  @ApiProperty({ example: true })
  isEnabled: boolean;

  @ApiProperty({ example: true })
  isDefault: boolean;

  @ApiProperty({ example: '2026-09-28T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-28T12:00:00.000Z' })
  updatedAt: Date;
}
