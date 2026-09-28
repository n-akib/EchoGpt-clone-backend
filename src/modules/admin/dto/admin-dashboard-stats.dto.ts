import { ApiProperty } from '@nestjs/swagger';

export class UsersStatsDto {
  @ApiProperty({ example: 120 })
  totalUsers: number;

  @ApiProperty({ example: 115 })
  activeUsers: number;

  @ApiProperty({ example: 5 })
  inactiveUsers: number;

  @ApiProperty({ example: 2 })
  adminCount: number;

  @ApiProperty({ example: 118 })
  userCount: number;
}

export class SubscriptionsStatsDto {
  @ApiProperty({ example: 120 })
  totalSubscriptions: number;

  @ApiProperty({ example: 115 })
  activeSubscriptions: number;

  @ApiProperty({ example: 95 })
  freePlanCount: number;

  @ApiProperty({ example: 25 })
  premiumPlanCount: number;

  @ApiProperty({ example: 1450 })
  totalRequestsConsumed: number;
}

export class ChatStatsDto {
  @ApiProperty({ example: 340 })
  totalConversations: number;

  @ApiProperty({ example: 1280 })
  totalMessages: number;

  @ApiProperty({ example: 640 })
  userMessages: number;

  @ApiProperty({ example: 640 })
  assistantMessages: number;

  @ApiProperty({ example: 154000 })
  promptTokens: number;

  @ApiProperty({ example: 280000 })
  completionTokens: number;

  @ApiProperty({ example: 434000 })
  totalTokens: number;
}

export class SearchStatsDto {
  @ApiProperty({ example: 450 })
  totalSearches: number;

  @ApiProperty({ example: 1800 })
  totalResultsReturned: number;
}

export class AdminDashboardStatsDto {
  @ApiProperty({ type: UsersStatsDto })
  users: UsersStatsDto;

  @ApiProperty({ type: SubscriptionsStatsDto })
  subscriptions: SubscriptionsStatsDto;

  @ApiProperty({ type: ChatStatsDto })
  chat: ChatStatsDto;

  @ApiProperty({ type: SearchStatsDto })
  search: SearchStatsDto;

  @ApiProperty({ example: 3 })
  activeAiProviders: number;

  @ApiProperty({ example: '2026-09-29T02:30:00.000Z' })
  generatedAt: Date;
}
