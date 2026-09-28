import { ApiProperty } from '@nestjs/swagger';
import { ConversationResponseDto } from './conversation-response.dto';
import { ChatMessageResponseDto } from './chat-message-response.dto';

export class ConversationDetailResponseDto extends ConversationResponseDto {
  @ApiProperty({
    type: [ChatMessageResponseDto],
    description: 'Chronological list of all messages in this conversation thread',
  })
  messages: ChatMessageResponseDto[];
}
