import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SendPromptDto } from './dto/send-prompt.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ChatMessageResponseDto } from './dto/chat-message-response.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { ConversationDetailResponseDto } from './dto/conversation-detail-response.dto';

@ApiTags('Chat')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send prompt to AI and receive response',
    description: 'Processes prompt through the selected or default AI provider, saves message to conversation history, and consumes 1 request from user subscription quota.',
  })
  @ApiResponse({
    status: 200,
    description: 'AI response generated and saved successfully',
    type: ChatMessageResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Subscription request limit reached' })
  @ApiBadRequestResponse({ description: 'Invalid input or disabled provider' })
  @ApiNotFoundResponse({ description: 'Conversation or provider not found' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Body() sendPromptDto: SendPromptDto,
  ): Promise<ChatMessageResponseDto> {
    return this.chatService.sendMessage(userId, sendPromptDto);
  }

  @Post('conversations')
  @ApiOperation({
    summary: 'Create a new conversation thread',
    description: 'Initializes a new chat thread for the authenticated user.',
  })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully',
    type: ConversationResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async createConversation(
    @CurrentUser('id') userId: string,
    @Body() createConversationDto?: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    return this.chatService.createConversation(userId, createConversationDto);
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'List user conversation threads',
    description: 'Returns all chat conversation threads for the current user ordered by most recently updated.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of conversation threads',
    type: [ConversationResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getUserConversations(
    @CurrentUser('id') userId: string,
  ): Promise<ConversationResponseDto[]> {
    return this.chatService.getUserConversations(userId);
  }

  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Get conversation details and full message history',
    description: 'Retrieves the conversation thread along with all chronological messages.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation details and messages',
    type: ConversationDetailResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
  async getConversation(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
  ): Promise<ConversationDetailResponseDto> {
    return this.chatService.getConversationById(userId, conversationId);
  }

  @Patch('conversations/:id')
  @ApiOperation({
    summary: 'Update conversation title',
    description: 'Renames an existing conversation thread.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation title updated successfully',
    type: ConversationResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
  async updateConversationTitle(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Body() updateDto: UpdateConversationDto,
  ): Promise<ConversationResponseDto> {
    return this.chatService.updateConversationTitle(
      userId,
      conversationId,
      updateDto.title,
    );
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete conversation thread',
    description: 'Permanently removes a conversation thread and all associated messages.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Conversation deleted successfully' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
  async deleteConversation(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
  ): Promise<{ message: string }> {
    return this.chatService.deleteConversation(userId, conversationId);
  }
}
