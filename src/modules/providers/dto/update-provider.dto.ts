import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ProviderType } from '../enums/provider-type.enum';

export class UpdateProviderDto {
  @ApiPropertyOptional({ example: 'OpenAI Primary Updated' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: ProviderType, example: ProviderType.OPENAI })
  @IsEnum(ProviderType)
  @IsOptional()
  type?: ProviderType;

  @ApiPropertyOptional({
    example: 'sk-proj-newkey...',
    description: 'New API key (leave empty to keep current key)',
  })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({ example: 'https://api.openai.com/v1' })
  @IsString()
  @IsOptional()
  baseUrl?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['gpt-4o', 'gpt-4o-mini'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  models?: string[];

  @ApiPropertyOptional({ example: 'gpt-4o-mini' })
  @IsString()
  @IsOptional()
  defaultModel?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
