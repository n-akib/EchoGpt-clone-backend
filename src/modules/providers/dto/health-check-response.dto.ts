import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderType } from '../enums/provider-type.enum';

export class HealthCheckResponseDto {
  @ApiProperty({ example: 'b3f54abc-1234-5678-9abc-def012345678' })
  providerId: string;

  @ApiProperty({ example: 'OpenAI Primary' })
  providerName: string;

  @ApiProperty({ enum: ProviderType, example: ProviderType.OPENAI })
  type: ProviderType;

  @ApiProperty({ example: 'healthy', enum: ['healthy', 'unhealthy'] })
  status: 'healthy' | 'unhealthy';

  @ApiProperty({ example: 120, description: 'Response latency in milliseconds' })
  latencyMs: number;

  @ApiPropertyOptional({
    example: 'HTTP 401: Invalid API key',
    description: 'Error message if unhealthy',
  })
  error?: string;

  @ApiProperty({ example: '2026-09-28T12:00:00.000Z' })
  timestamp: Date;
}
