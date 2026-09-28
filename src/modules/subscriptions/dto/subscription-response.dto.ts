import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan } from '../enums/subscription-plan.enum';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { PlanDetailsDto } from './plan-details.dto';

export class SubscriptionResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({ example: 'd3b07384-d113-4607-b222-421715ff28b5' })
  userId: string;

  @ApiProperty({ enum: SubscriptionPlan, example: SubscriptionPlan.FREE })
  plan: SubscriptionPlan;

  @ApiProperty({ enum: SubscriptionStatus, example: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @ApiProperty({ example: 50, description: 'Total requests allowed in current billing period' })
  monthlyLimit: number;

  @ApiProperty({ example: 5, description: 'Requests used so far in current billing period' })
  requestsUsed: number;

  @ApiProperty({ example: 45, description: 'Requests remaining in current billing period' })
  requestsRemaining: number;

  @ApiProperty({ example: '2026-09-01T00:00:00.000Z' })
  currentPeriodStart: Date;

  @ApiProperty({ example: '2026-10-01T00:00:00.000Z', nullable: true })
  currentPeriodEnd: Date | null;

  @ApiProperty({ type: PlanDetailsDto, description: 'Details of current plan' })
  planDetails: PlanDetailsDto;
}
