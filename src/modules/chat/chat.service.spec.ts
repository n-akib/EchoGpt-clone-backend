import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatConversation } from './entities/chat-conversation.entity';
import { ChatMessage, MessageRole } from './entities/chat-message.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ProvidersService } from '../providers/providers.service';
import { ProviderType } from '../providers/enums/provider-type.enum';

describe('ChatService', () => {
  let service: ChatService;
  let conversationRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    delete: jest.Mock;
  };
  let messageRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let subscriptionsService: {
    consumeRequest: jest.Mock;
    getSubscriptionStatus: jest.Mock;
  };
  let providersService: {
    findEntityWithApiKey: jest.Mock;
    findDefaultProviderWithApiKey: jest.Mock;
    findAllEnabled: jest.Mock;
    getStrategy: jest.Mock;
  };

  const mockConversation: ChatConversation = {
    id: 'conv-uuid-1',
    userId: 'user-uuid-1',
    user: null as any,
    title: 'Test Conversation',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProviderWithKey = {
    id: 'prov-uuid-1',
    name: 'OpenAI Primary',
    type: ProviderType.OPENAI,
    decryptedApiKey: 'sk-proj-testkey1234',
    defaultModel: 'gpt-4o-mini',
    isEnabled: true,
  };

  beforeEach(async () => {
    conversationRepository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) =>
        Promise.resolve({ ...mockConversation, ...entity }),
      ),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    messageRepository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) =>
        Promise.resolve({
          id: 'msg-uuid-1',
          createdAt: new Date(),
          ...entity,
        }),
      ),
    };

    subscriptionsService = {
      consumeRequest: jest.fn().mockResolvedValue({
        remaining: 49,
        used: 1,
        limit: 50,
      }),
      getSubscriptionStatus: jest.fn().mockResolvedValue({
        plan: 'free',
      }),
    };

    providersService = {
      findEntityWithApiKey: jest.fn(),
      findDefaultProviderWithApiKey: jest.fn(),
      findAllEnabled: jest.fn(),
      getStrategy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(ChatConversation),
          useValue: conversationRepository,
        },
        {
          provide: getRepositoryToken(ChatMessage),
          useValue: messageRepository,
        },
        {
          provide: SubscriptionsService,
          useValue: subscriptionsService,
        },
        {
          provide: ProvidersService,
          useValue: providersService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  describe('createConversation', () => {
    it('should create a new conversation thread', async () => {
      const result = await service.createConversation('user-uuid-1', {
        title: 'New Discussion',
      });

      expect(conversationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid-1',
          title: 'New Discussion',
        }),
      );
      expect(result.title).toBe('New Discussion');
    });
  });

  describe('getUserConversations', () => {
    it('should return all conversations for a user', async () => {
      conversationRepository.find.mockResolvedValue([mockConversation]);

      const result = await service.getUserConversations('user-uuid-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('conv-uuid-1');
    });
  });

  describe('getConversationById', () => {
    it('should return conversation details with messages', async () => {
      conversationRepository.findOne.mockResolvedValue({
        ...mockConversation,
        messages: [
          {
            id: 'msg-1',
            conversationId: 'conv-uuid-1',
            role: MessageRole.USER,
            content: 'Hello AI',
            createdAt: new Date(),
          },
        ],
      });

      const result = await service.getConversationById(
        'user-uuid-1',
        'conv-uuid-1',
      );

      expect(result.id).toBe('conv-uuid-1');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('Hello AI');
    });

    it('should throw NotFoundException if conversation not found', async () => {
      conversationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getConversationById('user-uuid-1', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateConversationTitle', () => {
    it('should update conversation title', async () => {
      conversationRepository.findOne.mockResolvedValue({ ...mockConversation });

      const result = await service.updateConversationTitle(
        'user-uuid-1',
        'conv-uuid-1',
        'Renamed Title',
      );

      expect(conversationRepository.save).toHaveBeenCalled();
      expect(result.title).toBe('Renamed Title');
    });
  });

  describe('deleteConversation', () => {
    it('should delete existing conversation', async () => {
      conversationRepository.findOne.mockResolvedValue(mockConversation);

      const result = await service.deleteConversation(
        'user-uuid-1',
        'conv-uuid-1',
      );

      expect(conversationRepository.delete).toHaveBeenCalledWith('conv-uuid-1');
      expect(result.message).toBe('Conversation deleted successfully');
    });
  });

  describe('sendMessage', () => {
    it('should consume subscription request, call provider strategy, save messages and return assistant response', async () => {
      providersService.findDefaultProviderWithApiKey.mockResolvedValue(
        mockProviderWithKey,
      );

      const mockStrategy = {
        sendPrompt: jest.fn().mockResolvedValue({
          content: 'Hello! How can I assist you?',
          model: 'gpt-4o-mini',
          provider: ProviderType.OPENAI,
          usage: {
            promptTokens: 10,
            completionTokens: 8,
            totalTokens: 18,
          },
        }),
      };
      providersService.getStrategy.mockReturnValue(mockStrategy);

      conversationRepository.findOne.mockResolvedValue(null);

      const result = await service.sendMessage('user-uuid-1', {
        message: 'Hello AI',
      });

      expect(subscriptionsService.consumeRequest).toHaveBeenCalledWith(
        'user-uuid-1',
      );
      expect(mockStrategy.sendPrompt).toHaveBeenCalled();
      expect(messageRepository.save).toHaveBeenCalledTimes(2); // 1 user msg + 1 assistant msg
      expect(result.content).toBe('Hello! How can I assist you?');
      expect(result.role).toBe(MessageRole.ASSISTANT);
      expect(result.totalTokens).toBe(18);
    });
  });

  describe('getAvailableChatProviders', () => {
    it('should mark non-default providers accessible for premium users', async () => {
      subscriptionsService.getSubscriptionStatus.mockResolvedValue({
        plan: 'premium',
      });
      providersService.findAllEnabled.mockResolvedValue([
        { id: '1', name: 'OpenAI', isDefault: true },
        { id: '2', name: 'Claude', isDefault: false },
      ]);

      const providers = await service.getAvailableChatProviders('user-uuid-1');

      expect(providers[0].isAccessible).toBe(true);
      expect(providers[1].isAccessible).toBe(true);
    });

    it('should mark non-default providers locked for free tier users', async () => {
      subscriptionsService.getSubscriptionStatus.mockResolvedValue({
        plan: 'free',
      });
      providersService.findAllEnabled.mockResolvedValue([
        { id: '1', name: 'OpenAI', isDefault: true },
        { id: '2', name: 'Claude', isDefault: false },
      ]);

      const providers = await service.getAvailableChatProviders('user-uuid-1');

      expect(providers[0].isAccessible).toBe(true);
      expect(providers[1].isAccessible).toBe(false);
      expect(providers[1].requiresPremium).toBe(true);
    });
  });

  describe('resolveProviderAndModel', () => {
    it('should throw ForbiddenException if free user tries to use non-default provider', async () => {
      subscriptionsService.getSubscriptionStatus.mockResolvedValue({
        plan: 'free',
      });
      providersService.findEntityWithApiKey.mockResolvedValue({
        ...mockProviderWithKey,
        isDefault: false,
      });

      await expect(
        service.resolveProviderAndModel('user-uuid-1', 'prov-uuid-2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow premium user to select non-default provider', async () => {
      subscriptionsService.getSubscriptionStatus.mockResolvedValue({
        plan: 'premium',
      });
      providersService.findEntityWithApiKey.mockResolvedValue({
        ...mockProviderWithKey,
        isDefault: false,
        models: ['claude-3-5-sonnet'],
        defaultModel: 'claude-3-5-sonnet',
      });
      providersService.getStrategy.mockReturnValue({ type: ProviderType.ANTHROPIC });

      const resolved = await service.resolveProviderAndModel(
        'user-uuid-1',
        'prov-uuid-2',
      );

      expect(resolved.model).toBe('claude-3-5-sonnet');
    });

    it('should throw BadRequestException if model is not supported by provider', async () => {
      subscriptionsService.getSubscriptionStatus.mockResolvedValue({
        plan: 'premium',
      });
      providersService.findEntityWithApiKey.mockResolvedValue({
        ...mockProviderWithKey,
        models: ['gpt-4o', 'gpt-4o-mini'],
      });

      await expect(
        service.resolveProviderAndModel(
          'user-uuid-1',
          'prov-uuid-1',
          'non-existent-model',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('streamMessage', () => {
    it('should stream chunks via observable and emit done event', (done) => {
      providersService.findDefaultProviderWithApiKey.mockResolvedValue(
        mockProviderWithKey,
      );

      const mockStrategy = {
        sendPrompt: jest.fn().mockResolvedValue({
          content: 'Streaming chunk response',
          model: 'gpt-4o-mini',
          provider: ProviderType.OPENAI,
          usage: {
            promptTokens: 5,
            completionTokens: 3,
            totalTokens: 8,
          },
        }),
      };
      providersService.getStrategy.mockReturnValue(mockStrategy);
      conversationRepository.findOne.mockResolvedValue(null);

      const events: any[] = [];
      const stream$ = service.streamMessage('user-uuid-1', {
        message: 'Hello streaming',
      });

      stream$.subscribe({
        next: (event) => {
          events.push(event.data);
        },
        complete: () => {
          expect(events.some((e) => e.event === 'start')).toBe(true);
          expect(events.some((e) => e.event === 'chunk')).toBe(true);
          expect(events.some((e) => e.event === 'done')).toBe(true);
          done();
        },
        error: (err) => {
          done(err);
        },
      });
    });
  });
});
