import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan } from '../enums/subscription-plan.enum';

export class UsageResponseDto {
  @ApiProperty({ enum: SubscriptionPlan, example: SubscriptionPlan.FREE })
  plan: SubscriptionPlan;

  @ApiProperty({ example: 50, description: 'Total requests allowed in this billing period' })
  monthlyLimit: number;

  @ApiProperty({ example: 12, description: 'Requests used in this billing period' })
  requestsUsed: number;

  @ApiProperty({ example: 38, description: 'Requests remaining before limit is reached' })
  requestsRemaining: number;

  @ApiProperty({ example: false, description: 'Whether the usage quota has been exhausted' })
  isLimitReached: boolean;

  @ApiProperty({
    example: '2026-10-01T00:00:00.000Z',
    description: 'Timestamp when the usage quota resets',
    nullable: true,
  })
  periodResetsAt: Date | null;
}
