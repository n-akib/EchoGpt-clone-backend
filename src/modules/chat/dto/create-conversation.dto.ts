import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @ApiPropertyOptional({
    example: 'TypeScript Project Discussion',
    description: 'Initial title for the conversation thread',
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  title?: string;
}
