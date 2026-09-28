import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageRole } from '../entities/chat-message.entity';

export class ChatMessageResponseDto {
  @ApiProperty({ example: 'm1n2o3p4-5678-90ab-cdef-1234567890ab' })
  id: string;

  @ApiProperty({ example: 'd3b07384-d113-4607-b222-421715ff28b5' })
  conversationId: string;

  @ApiProperty({ enum: MessageRole, example: MessageRole.ASSISTANT })
  role: MessageRole;

  @ApiProperty({ example: 'The Node.js event loop handles asynchronous operations...' })
  content: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', nullable: true })
  providerId: string | null;

  @ApiPropertyOptional({ example: 'OpenAI Primary', nullable: true })
  providerName?: string | null;

  @ApiPropertyOptional({ example: 'gpt-4o-mini', nullable: true })
  model: string | null;

  @ApiPropertyOptional({ example: 45, nullable: true })
  promptTokens: number | null;

  @ApiPropertyOptional({ example: 120, nullable: true })
  completionTokens: number | null;

  @ApiPropertyOptional({ example: 165, nullable: true })
  totalTokens: number | null;

  @ApiProperty({ example: '2026-09-28T12:00:00.000Z' })
  createdAt: Date;
}
