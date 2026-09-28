import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateConversationDto {
  @ApiProperty({
    example: 'Updated Topic Title',
    description: 'New title for the conversation thread',
  })
  @IsString()
  @IsNotEmpty({ message: 'Title cannot be empty' })
  @MaxLength(255)
  title: string;
}
