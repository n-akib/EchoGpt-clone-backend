import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionPlan } from '../../subscriptions/enums/subscription-plan.enum';
import { SubscriptionStatus } from '../../subscriptions/enums/subscription-status.enum';

export class AdminSubscriptionQueryDto {
  @ApiPropertyOptional({
    description: 'Filter subscriptions by plan',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.PREMIUM,
  })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @ApiPropertyOptional({
    description: 'Filter subscriptions by status',
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiPropertyOptional({
    description: 'Number of records per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;
}

export class AdminUpdateSubscriptionDto {
  @ApiPropertyOptional({
    description: 'Set subscription plan tier',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.PREMIUM,
  })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @ApiPropertyOptional({
    description: 'Set subscription status',
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiPropertyOptional({
    description: 'Custom monthly request quota limit override',
    example: 5000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  monthlyLimit?: number;

  @ApiPropertyOptional({
    description: 'Reset requests_used counter back to 0',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  resetUsage?: boolean;
}
