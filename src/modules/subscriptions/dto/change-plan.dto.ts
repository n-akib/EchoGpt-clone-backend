import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { SubscriptionPlan } from '../enums/subscription-plan.enum';

export class ChangePlanDto {
  @ApiProperty({
    enum: SubscriptionPlan,
    example: SubscriptionPlan.PREMIUM,
    description: 'The target subscription plan to switch to (free or premium)',
  })
  @IsEnum(SubscriptionPlan, {
    message: 'Plan must be either "free" or "premium"',
  })
  @IsNotEmpty({ message: 'Target plan is required' })
  plan: SubscriptionPlan;
}
