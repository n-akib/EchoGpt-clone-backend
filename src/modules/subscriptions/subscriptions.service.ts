import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionPlan } from './enums/subscription-plan.enum';
import { SubscriptionStatus } from './enums/subscription-status.enum';
import {
  SUBSCRIPTION_PLANS,
  PlanConfig,
} from './constants/subscription-plans.constant';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { PlanDetailsDto } from './dto/plan-details.dto';
import { ChangePlanDto } from './dto/change-plan.dto';
import { UsageResponseDto } from './dto/usage-response.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

  async getOrCreateUserSubscription(userId: string): Promise<Subscription> {
    let subscription = await this.subscriptionRepository.findOne({
      where: { userId },
    });

    if (!subscription) {
      const planConfig = SUBSCRIPTION_PLANS[SubscriptionPlan.FREE];
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      subscription = this.subscriptionRepository.create({
        userId,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        monthlyLimit: planConfig.monthlyRequestLimit,
        requestsUsed: 0,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });

      subscription = await this.subscriptionRepository.save(subscription);
    } else {
      // Check if billing period needs reset
      subscription = await this.checkAndResetPeriod(subscription);
    }

    return subscription;
  }

  async getSubscriptionStatus(userId: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.getOrCreateUserSubscription(userId);
    return this.mapToResponseDto(subscription);
  }

  async changePlan(
    userId: string,
    changePlanDto: ChangePlanDto,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.getOrCreateUserSubscription(userId);

    if (subscription.plan === changePlanDto.plan && subscription.status === SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        `You are already subscribed to the ${changePlanDto.plan} plan`,
      );
    }

    const newPlanConfig = SUBSCRIPTION_PLANS[changePlanDto.plan];
    if (!newPlanConfig) {
      throw new BadRequestException(`Invalid subscription plan: ${changePlanDto.plan}`);
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    subscription.plan = changePlanDto.plan;
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.monthlyLimit = newPlanConfig.monthlyRequestLimit;
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = periodEnd;

    // When upgrading to premium, reset usage so user gets full allocation
    if (changePlanDto.plan === SubscriptionPlan.PREMIUM) {
      subscription.requestsUsed = 0;
    }

    const saved = await this.subscriptionRepository.save(subscription);
    return this.mapToResponseDto(saved);
  }

  async getUsage(userId: string): Promise<UsageResponseDto> {
    const subscription = await this.getOrCreateUserSubscription(userId);
    const remaining = Math.max(
      0,
      subscription.monthlyLimit - subscription.requestsUsed,
    );

    return {
      plan: subscription.plan,
      monthlyLimit: subscription.monthlyLimit,
      requestsUsed: subscription.requestsUsed,
      requestsRemaining: remaining,
      isLimitReached: subscription.requestsUsed >= subscription.monthlyLimit,
      periodResetsAt: subscription.currentPeriodEnd,
    };
  }

  async canConsumeRequest(userId: string): Promise<boolean> {
    const subscription = await this.getOrCreateUserSubscription(userId);
    return subscription.requestsUsed < subscription.monthlyLimit;
  }

  async consumeRequest(
    userId: string,
  ): Promise<{ remaining: number; used: number; limit: number }> {
    const subscription = await this.getOrCreateUserSubscription(userId);

    if (subscription.requestsUsed >= subscription.monthlyLimit) {
      throw new ForbiddenException(
        `Monthly request limit of ${subscription.monthlyLimit} reached for your ${subscription.plan} plan. Please upgrade your subscription to continue.`,
      );
    }

    subscription.requestsUsed += 1;
    await this.subscriptionRepository.save(subscription);

    const remaining = Math.max(
      0,
      subscription.monthlyLimit - subscription.requestsUsed,
    );

    return {
      remaining,
      used: subscription.requestsUsed,
      limit: subscription.monthlyLimit,
    };
  }

  getAvailablePlans(): PlanDetailsDto[] {
    return Object.values(SUBSCRIPTION_PLANS);
  }

  async checkAndResetPeriod(subscription: Subscription): Promise<Subscription> {
    const now = new Date();
    if (subscription.currentPeriodEnd && now > subscription.currentPeriodEnd) {
      subscription.requestsUsed = 0;
      subscription.currentPeriodStart = now;
      const nextEnd = new Date(now);
      nextEnd.setMonth(nextEnd.getMonth() + 1);
      subscription.currentPeriodEnd = nextEnd;
      return this.subscriptionRepository.save(subscription);
    }
    return subscription;
  }

  mapToResponseDto(subscription: Subscription): SubscriptionResponseDto {
    const planConfig: PlanConfig =
      SUBSCRIPTION_PLANS[subscription.plan] ||
      SUBSCRIPTION_PLANS[SubscriptionPlan.FREE];

    const remaining = Math.max(
      0,
      subscription.monthlyLimit - subscription.requestsUsed,
    );

    return {
      id: subscription.id,
      userId: subscription.userId,
      plan: subscription.plan,
      status: subscription.status,
      monthlyLimit: subscription.monthlyLimit,
      requestsUsed: subscription.requestsUsed,
      requestsRemaining: remaining,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      planDetails: {
        id: planConfig.id,
        name: planConfig.name,
        priceMonthly: planConfig.priceMonthly,
        monthlyRequestLimit: planConfig.monthlyRequestLimit,
        features: planConfig.features,
      },
    };
  }
}
