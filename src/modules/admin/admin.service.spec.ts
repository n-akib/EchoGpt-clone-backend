import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ProvidersService } from '../providers/providers.service';
import { ChatService } from '../chat/chat.service';
import { SearchService } from '../search/search.service';
import { UserRole } from '../users/enums/user-role.enum';
import { SubscriptionPlan } from '../subscriptions/enums/subscription-plan.enum';
import { SubscriptionStatus } from '../subscriptions/enums/subscription-status.enum';
import { ProviderType } from '../providers/enums/provider-type.enum';

describe('AdminService', () => {
  let service: AdminService;
  let usersService: any;
  let subscriptionsService: any;
  let providersService: any;
  let chatService: any;
  let searchService: any;
  let dataSource: any;

  beforeEach(async () => {
    usersService = {
      getUsersStats: jest.fn().mockResolvedValue({
        totalUsers: 100,
        activeUsers: 95,
        inactiveUsers: 5,
        adminCount: 2,
        userCount: 98,
      }),
      findUsersAdmin: jest.fn().mockResolvedValue({
        users: [
          {
            id: 'u1',
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: UserRole.USER,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
      }),
      updateUserRole: jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'user@example.com',
        role: UserRole.ADMIN,
      }),
      updateUserStatus: jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'user@example.com',
        isActive: false,
      }),
    };

    subscriptionsService = {
      getSubscriptionStats: jest.fn().mockResolvedValue({
        totalSubscriptions: 100,
        activeSubscriptions: 95,
        freePlanCount: 80,
        premiumPlanCount: 20,
        totalRequestsConsumed: 1200,
      }),
      findAllSubscriptions: jest.fn().mockResolvedValue({
        subscriptions: [
          {
            id: 'sub-1',
            userId: 'u1',
            plan: SubscriptionPlan.PREMIUM,
            status: SubscriptionStatus.ACTIVE,
          },
        ],
        total: 1,
      }),
      adminUpdateSubscription: jest.fn().mockResolvedValue({
        id: 'sub-1',
        userId: 'u1',
        plan: SubscriptionPlan.PREMIUM,
        status: SubscriptionStatus.ACTIVE,
        monthlyLimit: 5000,
      }),
    };

    providersService = {
      findAll: jest.fn().mockResolvedValue([
        {
          id: 'p1',
          name: 'OpenAI Provider',
          type: ProviderType.OPENAI,
          isEnabled: true,
          isDefault: true,
        },
      ]),
      healthCheck: jest.fn().mockResolvedValue({
        providerId: 'p1',
        providerName: 'OpenAI Provider',
        status: 'healthy',
        latencyMs: 120,
        timestamp: new Date(),
      }),
      toggleEnabled: jest.fn().mockResolvedValue({
        id: 'p1',
        isEnabled: false,
      }),
      setDefault: jest.fn().mockResolvedValue({
        id: 'p1',
        isDefault: true,
      }),
    };

    chatService = {
      getChatStats: jest.fn().mockResolvedValue({
        totalConversations: 50,
        totalMessages: 200,
        userMessages: 100,
        assistantMessages: 100,
        promptTokens: 20000,
        completionTokens: 40000,
        totalTokens: 60000,
        messagesByModel: [{ model: 'gpt-4o', count: 120 }],
      }),
    };

    searchService = {
      getSearchStats: jest.fn().mockResolvedValue({
        totalSearches: 85,
        totalResultsReturned: 340,
        popularQueries: [{ query: 'nestjs', count: 15 }],
      }),
    };

    dataSource = {
      query: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: UsersService, useValue: usersService },
        { provide: SubscriptionsService, useValue: subscriptionsService },
        { provide: ProvidersService, useValue: providersService },
        { provide: ChatService, useValue: chatService },
        { provide: SearchService, useValue: searchService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardStats', () => {
    it('should aggregate statistics from all sub-services', async () => {
      const stats = await service.getDashboardStats();

      expect(stats).toBeDefined();
      expect(stats.users.totalUsers).toBe(100);
      expect(stats.subscriptions.totalSubscriptions).toBe(100);
      expect(stats.chat.totalMessages).toBe(200);
      expect(stats.search.totalSearches).toBe(85);
      expect(stats.activeAiProviders).toBe(1);
    });
  });

  describe('getUsageAnalytics', () => {
    it('should return token usage and model breakdown metrics', async () => {
      const analytics = await service.getUsageAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.totalTokensConsumed).toBe(60000);
      expect(analytics.subscriptionQuotaUsed).toBe(1200);
      expect(analytics.modelUsageBreakdown[0].model).toBe('gpt-4o');
      expect(analytics.popularSearches[0].query).toBe('nestjs');
    });
  });

  describe('user management', () => {
    it('should query and return users list with total count', async () => {
      const res = await service.getUsers({ limit: 10, page: 1 });
      expect(res.total).toBe(1);
      expect(res.users.length).toBe(1);
      expect(res.users[0].email).toBe('user@example.com');
    });

    it('should update user role', async () => {
      const res = await service.updateUserRole('u1', UserRole.ADMIN);
      expect(res.role).toBe(UserRole.ADMIN);
      expect(usersService.updateUserRole).toHaveBeenCalledWith('u1', UserRole.ADMIN);
    });

    it('should update user active status', async () => {
      const res = await service.updateUserStatus('u1', false);
      expect(res.isActive).toBe(false);
      expect(usersService.updateUserStatus).toHaveBeenCalledWith('u1', false);
    });
  });

  describe('subscription management', () => {
    it('should list all subscriptions with filter', async () => {
      const res = await service.getSubscriptions({ plan: SubscriptionPlan.PREMIUM });
      expect(res.total).toBe(1);
      expect(res.subscriptions[0].plan).toBe(SubscriptionPlan.PREMIUM);
    });

    it('should override user subscription', async () => {
      const res = await service.updateSubscription('u1', {
        monthlyLimit: 5000,
        plan: SubscriptionPlan.PREMIUM,
      });
      expect(res.monthlyLimit).toBe(5000);
    });
  });

  describe('provider management', () => {
    it('should list all AI providers', async () => {
      const res = await service.getProviders();
      expect(res.length).toBe(1);
      expect(res[0].name).toBe('OpenAI Provider');
    });

    it('should test provider health check', async () => {
      const res = await service.checkProviderHealth('p1');
      expect(res.status).toBe('healthy');
    });

    it('should toggle provider active status', async () => {
      const res = await service.toggleProvider('p1', false);
      expect(res.isEnabled).toBe(false);
    });

    it('should set default provider', async () => {
      const res = await service.setDefaultProvider('p1');
      expect(res.isDefault).toBe(true);
    });
  });

  describe('system health and logs', () => {
    it('should return system health metrics including database and memory', async () => {
      const health = await service.getSystemHealth();
      expect(health.status).toBe('healthy');
      expect(health.database.status).toBe('connected');
      expect(health.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(health.memory.rss).toBeDefined();
    });

    it('should handle database ping failure gracefully in health check', async () => {
      dataSource.query.mockRejectedValue(new Error('Connection lost'));
      const health = await service.getSystemHealth();
      expect(health.status).toBe('degraded');
      expect(health.database.status).toContain('disconnected');
    });

    it('should return system logs', async () => {
      const logs = await service.getSystemLogs();
      expect(logs.total).toBeGreaterThan(0);
      expect(logs.logs.length).toBe(logs.total);
    });
  });
});
