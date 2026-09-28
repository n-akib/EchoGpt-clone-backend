import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionPlan } from './enums/subscription-plan.enum';
import { SubscriptionStatus } from './enums/subscription-status.enum';
import { SUBSCRIPTION_PLANS } from './constants/subscription-plans.constant';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let subscriptionRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };

  const mockSubscription: Subscription = {
    id: 'sub-uuid-1',
    userId: 'user-uuid-1',
    user: null as any,
    plan: SubscriptionPlan.FREE,
    status: SubscriptionStatus.ACTIVE,
    monthlyLimit: 50,
    requestsUsed: 10,
    currentPeriodStart: new Date('2026-09-01T00:00:00Z'),
    currentPeriodEnd: new Date('2026-10-01T00:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    subscriptionRepository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...mockSubscription, ...entity })),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: subscriptionRepository,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  describe('getOrCreateUserSubscription', () => {
    it('should create and return a free subscription if none exists', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);

      const result = await service.getOrCreateUserSubscription('user-uuid-1');

      expect(subscriptionRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
      });
      expect(subscriptionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid-1',
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          monthlyLimit: 50,
          requestsUsed: 0,
        }),
      );
      expect(subscriptionRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should return existing subscription if found', async () => {
      subscriptionRepository.findOne.mockResolvedValue({ ...mockSubscription });

      const result = await service.getOrCreateUserSubscription('user-uuid-1');

      expect(result.userId).toBe('user-uuid-1');
      expect(result.plan).toBe(SubscriptionPlan.FREE);
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return mapped subscription response with remaining requests', async () => {
      subscriptionRepository.findOne.mockResolvedValue({
        ...mockSubscription,
        monthlyLimit: 50,
        requestsUsed: 15,
      });

      const result = await service.getSubscriptionStatus('user-uuid-1');

      expect(result.userId).toBe('user-uuid-1');
      expect(result.plan).toBe(SubscriptionPlan.FREE);
      expect(result.monthlyLimit).toBe(50);
      expect(result.requestsUsed).toBe(15);
      expect(result.requestsRemaining).toBe(35);
      expect(result.planDetails).toBeDefined();
      expect(result.planDetails.id).toBe(SubscriptionPlan.FREE);
    });
  });

  describe('getAvailablePlans', () => {
    it('should return list of all subscription plans', () => {
      const plans = service.getAvailablePlans();

      expect(plans.length).toBe(Object.keys(SUBSCRIPTION_PLANS).length);
      expect(plans.map((p) => p.id)).toContain(SubscriptionPlan.FREE);
      expect(plans.map((p) => p.id)).toContain(SubscriptionPlan.PREMIUM);
    });
  });

  describe('checkAndResetPeriod', () => {
    it('should reset requestsUsed and advance period if currentPeriodEnd is in past', async () => {
      const pastEnd = new Date();
      pastEnd.setDate(pastEnd.getDate() - 2);

      const expiredPeriodSub: Subscription = {
        ...mockSubscription,
        requestsUsed: 50,
        currentPeriodEnd: pastEnd,
      };

      const result = await service.checkAndResetPeriod(expiredPeriodSub);

      expect(subscriptionRepository.save).toHaveBeenCalled();
      expect(result.requestsUsed).toBe(0);
      expect(result.currentPeriodEnd.getTime()).toBeGreaterThan(Date.now());
    });

    it('should not reset if currentPeriodEnd is in future', async () => {
      const futureEnd = new Date();
      futureEnd.setDate(futureEnd.getDate() + 15);

      const activeSub: Subscription = {
        ...mockSubscription,
        requestsUsed: 20,
        currentPeriodEnd: futureEnd,
      };

      const result = await service.checkAndResetPeriod(activeSub);

      expect(subscriptionRepository.save).not.toHaveBeenCalled();
      expect(result.requestsUsed).toBe(20);
    });
  });

  describe('changePlan', () => {
    it('should successfully upgrade from Free to Premium plan', async () => {
      subscriptionRepository.findOne.mockResolvedValue({
        ...mockSubscription,
        plan: SubscriptionPlan.FREE,
        requestsUsed: 25,
      });

      const result = await service.changePlan('user-uuid-1', {
        plan: SubscriptionPlan.PREMIUM,
      });

      expect(subscriptionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: SubscriptionPlan.PREMIUM,
          monthlyLimit: 1000,
          requestsUsed: 0,
        }),
      );
      expect(result.plan).toBe(SubscriptionPlan.PREMIUM);
      expect(result.monthlyLimit).toBe(1000);
      expect(result.requestsRemaining).toBe(1000);
    });

    it('should successfully downgrade from Premium to Free plan', async () => {
      subscriptionRepository.findOne.mockResolvedValue({
        ...mockSubscription,
        plan: SubscriptionPlan.PREMIUM,
        monthlyLimit: 1000,
        requestsUsed: 10,
      });

      const result = await service.changePlan('user-uuid-1', {
        plan: SubscriptionPlan.FREE,
      });

      expect(subscriptionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: SubscriptionPlan.FREE,
          monthlyLimit: 50,
        }),
      );
      expect(result.plan).toBe(SubscriptionPlan.FREE);
      expect(result.monthlyLimit).toBe(50);
    });

    it('should throw BadRequestException when changing to same current plan', async () => {
      subscriptionRepository.findOne.mockResolvedValue({
        ...mockSubscription,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
      });

      await expect(
        service.changePlan('user-uuid-1', {
          plan: SubscriptionPlan.FREE,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
