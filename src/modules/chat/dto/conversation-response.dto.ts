import { ApiProperty } from '@nestjs/swagger';

export class ConversationResponseDto {
  @ApiProperty({ example: 'd3b07384-d113-4607-b222-421715ff28b5' })
  id: string;

  @ApiProperty({ example: 'user-uuid-1' })
  userId: string;

  @ApiProperty({ example: 'TypeScript Project Discussion' })
  title: string;

  @ApiProperty({ example: '2026-09-28T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-28T12:05:00.000Z' })
  updatedAt: Date;
}
