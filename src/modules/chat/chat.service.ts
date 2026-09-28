import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatConversation } from './entities/chat-conversation.entity';
import { ChatMessage, MessageRole } from './entities/chat-message.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ProvidersService } from '../providers/providers.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendPromptDto } from './dto/send-prompt.dto';
import { ChatMessageResponseDto } from './dto/chat-message-response.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { ConversationDetailResponseDto } from './dto/conversation-detail-response.dto';
import { PromptMessage } from '../providers/interfaces/ai-provider.interface';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatConversation)
    private readonly conversationRepository: Repository<ChatConversation>,
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly providersService: ProvidersService,
  ) {}

  async createConversation(
    userId: string,
    createDto?: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    const conversation = this.conversationRepository.create({
      userId,
      title: createDto?.title?.trim() || 'New Chat',
    });

    const saved = await this.conversationRepository.save(conversation);
    return this.mapToConversationDto(saved);
  }

  async getUserConversations(
    userId: string,
  ): Promise<ConversationResponseDto[]> {
    const conversations = await this.conversationRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });

    return conversations.map((conv) => this.mapToConversationDto(conv));
  }

  async getConversationById(
    userId: string,
    conversationId: string,
  ): Promise<ConversationDetailResponseDto> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
      relations: ['messages', 'messages.provider'],
      order: {
        messages: {
          createdAt: 'ASC',
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID "${conversationId}" not found`,
      );
    }

    return {
      id: conversation.id,
      userId: conversation.userId,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: (conversation.messages || []).map((msg) =>
        this.mapToMessageDto(msg),
      ),
    };
  }

  async updateConversationTitle(
    userId: string,
    conversationId: string,
    title: string,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID "${conversationId}" not found`,
      );
    }

    conversation.title = title.trim();
    const saved = await this.conversationRepository.save(conversation);
    return this.mapToConversationDto(saved);
  }

  async deleteConversation(
    userId: string,
    conversationId: string,
  ): Promise<{ message: string }> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID "${conversationId}" not found`,
      );
    }

    await this.conversationRepository.delete(conversationId);
    return { message: 'Conversation deleted successfully' };
  }

  async getAvailableChatProviders(userId: string) {
    const subscription = await this.subscriptionsService.getSubscriptionStatus(userId);
    const isPremium = subscription.plan === 'premium';
    const providers = await this.providersService.findAllEnabled();

    return providers.map((prov) => ({
      ...prov,
      isAccessible: isPremium || prov.isDefault,
      requiresPremium: !prov.isDefault,
    }));
  }

  async resolveProviderAndModel(
    userId: string,
    requestedProviderId?: string,
    requestedModel?: string,
  ): Promise<{
    provider: any;
    model: string;
    strategy: any;
  }> {
    const subscription =
      await this.subscriptionsService.getSubscriptionStatus(userId);
    const isPremium = subscription.plan === 'premium';

    let providerWithKey: any;

    if (requestedProviderId) {
      providerWithKey = await this.providersService.findEntityWithApiKey(
        requestedProviderId,
      );

      if (!providerWithKey.isEnabled) {
        throw new BadRequestException(
          `AI Provider "${providerWithKey.name}" is currently disabled`,
        );
      }

      // Free tier users cannot choose non-default providers
      if (!isPremium && !providerWithKey.isDefault) {
        throw new ForbiddenException(
          `Provider "${providerWithKey.name}" is a Premium feature. Please upgrade to Premium to switch providers.`,
        );
      }
    } else {
      providerWithKey =
        await this.providersService.findDefaultProviderWithApiKey();
    }

    // Validate requested model if provided
    let model = providerWithKey.defaultModel;
    if (requestedModel) {
      const supportedModels = providerWithKey.models || [];
      if (
        supportedModels.length > 0 &&
        !supportedModels.includes(requestedModel)
      ) {
        throw new BadRequestException(
          `Model "${requestedModel}" is not supported by ${providerWithKey.name}. Supported models: ${supportedModels.join(', ')}`,
        );
      }
      model = requestedModel;
    }

    const strategy = this.providersService.getStrategy(providerWithKey.type);

    return {
      provider: providerWithKey,
      model,
      strategy,
    };
  }

  async sendMessage(
    userId: string,
    sendPromptDto: SendPromptDto,
  ): Promise<ChatMessageResponseDto> {
    // 1. Consume 1 request quota from subscription
    await this.subscriptionsService.consumeRequest(userId);

    // 2. Resolve AI provider and model with plan validation
    const { provider: providerWithKey, model, strategy } =
      await this.resolveProviderAndModel(
        userId,
        sendPromptDto.providerId,
        sendPromptDto.model,
      );

    // 3. Resolve or create conversation
    let conversation: ChatConversation;
    let isNewConversation = false;

    if (sendPromptDto.conversationId) {
      const found = await this.conversationRepository.findOne({
        where: { id: sendPromptDto.conversationId, userId },
        relations: ['messages'],
        order: {
          messages: {
            createdAt: 'ASC',
          },
        },
      });

      if (!found) {
        throw new NotFoundException(
          `Conversation with ID "${sendPromptDto.conversationId}" not found`,
        );
      }
      conversation = found;
    } else {
      isNewConversation = true;
      const initialTitle =
        sendPromptDto.message.slice(0, 40).trim() || 'New Chat';
      conversation = this.conversationRepository.create({
        userId,
        title: initialTitle,
      });
      conversation = await this.conversationRepository.save(conversation);
      conversation.messages = [];
    }

    // 4. Save User message to DB
    const userMessage = this.messageRepository.create({
      conversationId: conversation.id,
      role: MessageRole.USER,
      content: sendPromptDto.message,
    });
    await this.messageRepository.save(userMessage);

    // 5. Build prompt history
    const promptMessages: PromptMessage[] = [];

    if (sendPromptDto.systemPrompt) {
      promptMessages.push({
        role: 'system',
        content: sendPromptDto.systemPrompt,
      });
    }

    if (conversation.messages && conversation.messages.length > 0) {
      for (const msg of conversation.messages) {
        promptMessages.push({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    promptMessages.push({
      role: 'user',
      content: sendPromptDto.message,
    });

    // 6. Execute AI provider strategy
    const aiResponse = await strategy.sendPrompt(
      providerWithKey.decryptedApiKey,
      promptMessages,
      {
        model,
        temperature: sendPromptDto.temperature,
      },
      providerWithKey.baseUrl || undefined,
    );

    // 7. Save Assistant message to DB
    const assistantMessage = this.messageRepository.create({
      conversationId: conversation.id,
      role: MessageRole.ASSISTANT,
      content: aiResponse.content,
      providerId: providerWithKey.id,
      model: aiResponse.model,
      promptTokens: aiResponse.usage?.promptTokens || null,
      completionTokens: aiResponse.usage?.completionTokens || null,
      totalTokens: aiResponse.usage?.totalTokens || null,
    });

    const savedAssistantMessage =
      await this.messageRepository.save(assistantMessage);

    // 8. Update conversation title if needed and bump updatedAt
    if (!isNewConversation && conversation.title === 'New Chat') {
      conversation.title =
        sendPromptDto.message.slice(0, 40).trim() || 'New Chat';
    }
    conversation.updatedAt = new Date();
    await this.conversationRepository.save(conversation);

    savedAssistantMessage.provider = providerWithKey;
    return this.mapToMessageDto(savedAssistantMessage);
  }

  private mapToConversationDto(
    entity: ChatConversation,
  ): ConversationResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      title: entity.title,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private mapToMessageDto(entity: ChatMessage): ChatMessageResponseDto {
    return {
      id: entity.id,
      conversationId: entity.conversationId,
      role: entity.role,
      content: entity.content,
      providerId: entity.providerId,
      providerName: entity.provider?.name || null,
      model: entity.model,
      promptTokens: entity.promptTokens,
      completionTokens: entity.completionTokens,
      totalTokens: entity.totalTokens,
      createdAt: entity.createdAt,
    };
  }
}
