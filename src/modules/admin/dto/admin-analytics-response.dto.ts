import { ApiProperty } from '@nestjs/swagger';

export class ModelUsageAnalyticsDto {
  @ApiProperty({ example: 'gpt-4o' })
  model: string;

  @ApiProperty({ example: 450 })
  count: number;
}

export class PopularSearchQueryDto {
  @ApiProperty({ example: 'nestjs microservices' })
  query: string;

  @ApiProperty({ example: 42 })
  count: number;
}

export class AdminUsageAnalyticsDto {
  @ApiProperty({ example: 1280 })
  totalChatMessages: number;

  @ApiProperty({ example: 434000 })
  totalTokensConsumed: number;

  @ApiProperty({ example: 154000 })
  promptTokensConsumed: number;

  @ApiProperty({ example: 280000 })
  completionTokensConsumed: number;

  @ApiProperty({ example: 1450 })
  subscriptionQuotaUsed: number;

  @ApiProperty({ example: 450 })
  totalWebSearches: number;

  @ApiProperty({ type: [ModelUsageAnalyticsDto] })
  modelUsageBreakdown: ModelUsageAnalyticsDto[];

  @ApiProperty({ type: [PopularSearchQueryDto] })
  popularSearches: PopularSearchQueryDto[];
}
