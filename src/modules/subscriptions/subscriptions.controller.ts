import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { PlanDetailsDto } from './dto/plan-details.dto';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({
    summary: 'List available subscription plans',
    description: 'Returns list of all available subscription plans with pricing, limits, and features.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of plans',
    type: [PlanDetailsDto],
  })
  getPlans(): PlanDetailsDto[] {
    return this.subscriptionsService.getAvailablePlans();
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user subscription status',
    description: 'Retrieves current subscription tier, status, limit, usage, and renewal dates for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current subscription status retrieved successfully',
    type: SubscriptionResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getStatus(
    @CurrentUser('id') userId: string,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.getSubscriptionStatus(userId);
  }
}
