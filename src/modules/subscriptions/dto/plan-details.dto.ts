import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan } from '../enums/subscription-plan.enum';

export class PlanDetailsDto {
  @ApiProperty({ enum: SubscriptionPlan, example: SubscriptionPlan.FREE })
  id: SubscriptionPlan;

  @ApiProperty({ example: 'Free Plan' })
  name: string;

  @ApiProperty({ example: 0, description: 'Monthly price in USD' })
  priceMonthly: number;

  @ApiProperty({ example: 50, description: 'Number of AI requests allowed per billing cycle' })
  monthlyRequestLimit: number;

  @ApiProperty({
    type: [String],
    example: ['50 AI requests per month', 'Standard response speed'],
    description: 'Features included in this plan tier',
  })
  features: string[];
}
