import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { PlanDetailsDto } from './dto/plan-details.dto';
import { ChangePlanDto } from './dto/change-plan.dto';

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

  @Post('change-plan')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Upgrade or downgrade subscription plan',
    description: 'Switches the user subscription to the specified plan (free or premium). Limits and billing periods are updated accordingly.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription plan updated successfully',
    type: SubscriptionResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid plan or already on requested plan' })
  async changePlan(
    @CurrentUser('id') userId: string,
    @Body() changePlanDto: ChangePlanDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.changePlan(userId, changePlanDto);
  }
}
