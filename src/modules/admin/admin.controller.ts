import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { AdminDashboardStatsDto } from './dto/admin-dashboard-stats.dto';
import { AdminUsageAnalyticsDto } from './dto/admin-analytics-response.dto';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { AdminUpdateUserRoleDto } from './dto/admin-update-user-role.dto';
import { AdminUpdateUserStatusDto } from './dto/admin-update-user-status.dto';
import {
  AdminSubscriptionQueryDto,
  AdminUpdateSubscriptionDto,
} from './dto/admin-subscription-query.dto';
import {
  AdminSystemHealthDto,
  AdminSystemLogsDto,
} from './dto/admin-system-health.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { SubscriptionResponseDto } from '../subscriptions/dto/subscription-response.dto';
import { ProviderResponseDto } from '../providers/dto/provider-response.dto';
import { HealthCheckResponseDto } from '../providers/dto/health-check-response.dto';

@ApiTags('Admin Panel')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get system dashboard statistics',
    description: 'Returns aggregated high-level metrics for users, subscriptions, chats, searches, and AI providers. Restricted to administrators.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics summary',
    type: AdminDashboardStatsDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden: Requires Admin role' })
  async getDashboard(): Promise<AdminDashboardStatsDto> {
    return this.adminService.getDashboardStats();
  }

  @Get('analytics/usage')
  @ApiOperation({
    summary: 'Get AI and system usage analytics',
    description: 'Returns detailed breakdown of tokens consumed, model usage distribution, search volumes, and quota metrics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Usage analytics breakdown',
    type: AdminUsageAnalyticsDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden: Requires Admin role' })
  async getUsageAnalytics(): Promise<AdminUsageAnalyticsDto> {
    return this.adminService.getUsageAnalytics();
  }

  @Get('users')
  @ApiOperation({
    summary: 'List users with filtering and pagination',
    description: 'Retrieves users with optional search by name/email, role filter, and active status filter.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated user list',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden: Requires Admin role' })
  async getUsers(
    @Query() query: AdminUserQueryDto,
  ): Promise<{ users: UserResponseDto[]; total: number }> {
    return this.adminService.getUsers(query);
  }

  @Patch('users/:id/role')
  @ApiOperation({
    summary: 'Update user role',
    description: 'Promotes or demotes a user role between User and Admin.',
  })
  @ApiResponse({
    status: 200,
    description: 'User role updated successfully',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden: Requires Admin role' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async updateUserRole(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: AdminUpdateUserRoleDto,
  ): Promise<UserResponseDto> {
    return this.adminService.updateUserRole(userId, dto.role);
  }

  @Patch('users/:id/status')
  @ApiOperation({
    summary: 'Update user active/banned status',
    description: 'Activates or deactivates (bans) a user account.',
  })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden: Requires Admin role' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async updateUserStatus(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: AdminUpdateUserStatusDto,
  ): Promise<UserResponseDto> {
    return this.adminService.updateUserStatus(userId, dto.isActive);
  }

  @Get('subscriptions')
  @ApiOperation({
    summary: 'List all user subscriptions',
    description: 'Retrieves all user subscriptions with filtering by plan and status.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of subscriptions',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden: Requires Admin role' })
  async getSubscriptions(
    @Query() query: AdminSubscriptionQueryDto,
  ): Promise<{ subscriptions: SubscriptionResponseDto[]; total: number }> {
    return this.adminService.getSubscriptions(query);
  }

  @Patch('subscriptions/:userId')
  @ApiOperation({
    summary: 'Override user subscription details',
    description: 'Admin override for user subscription plan, quota limits, status, or usage reset.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription updated successfully',
    type: SubscriptionResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden: Requires Admin role' })
  @ApiNotFoundResponse({ description: 'User subscription not found' })
  async updateSubscription(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateDto: AdminUpdateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.adminService.updateSubscription(userId, updateDto);
  }

  @Get('providers')
  @ApiOperation({
    summary: 'List all AI providers',
    description: 'Returns all configured AI providers with models and active status.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of AI providers',
    type: [ProviderResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden: Requires Admin role' })
  async getProviders(): Promise<ProviderResponseDto[]> {
    return this.adminService.getProviders();
  }

  @Get('providers/:id/health')
  @ApiOperation({
    summary: 'Test health check for a specific AI provider',
    description: 'Executes a test ping request using the provider credentials.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check result',
    type: HealthCheckResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden: Requires Admin role' })
  @ApiNotFoundResponse({ description: 'Provider not found' })
  async checkProviderHealth(
    @Param('id', ParseUUIDPipe) providerId: string,
  ): Promise<HealthCheckResponseDto> {
    return this.adminService.checkProviderHealth(providerId);
  }

  @Patch('providers/:id/toggle')
  @ApiOperation({
    summary: 'Toggle provider active state',
    description: 'Enables or disables an AI provider system-wide.',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider status updated',
    type: ProviderResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden: Requires Admin role' })
  @ApiNotFoundResponse({ description: 'Provider not found' })
  async toggleProvider(
    @Param('id', ParseUUIDPipe) providerId: string,
    @Body('isEnabled') isEnabled?: boolean,
    @Body('isActive') isActive?: boolean,
  ): Promise<ProviderResponseDto> {
    const enabled = isEnabled !== undefined ? isEnabled : isActive;
    return this.adminService.toggleProvider(providerId, enabled ?? true);
  }

  @Patch('providers/:id/default')
  @ApiOperation({
    summary: 'Set AI provider as system default',
    description: 'Designates the selected AI provider as the primary system fallback provider.',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider designated as default',
    type: ProviderResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden: Requires Admin role' })
  @ApiNotFoundResponse({ description: 'Provider not found' })
  async setDefaultProvider(
    @Param('id', ParseUUIDPipe) providerId: string,
  ): Promise<ProviderResponseDto> {
    return this.adminService.setDefaultProvider(providerId);
  }

  @Get('system/health')
  @ApiOperation({
    summary: 'System health check and diagnostic metrics',
    description: 'Returns database connectivity status, memory utilization, and uptime metrics.',
  })
  @ApiResponse({
    status: 200,
    description: 'System health metrics',
    type: AdminSystemHealthDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden: Requires Admin role' })
  async getSystemHealth(): Promise<AdminSystemHealthDto> {
    return this.adminService.getSystemHealth();
  }

  @Get('system/logs')
  @ApiOperation({
    summary: 'Get system audit and activity logs',
    description: 'Returns recent activity and operational logs for administrative inspection.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent system logs',
    type: AdminSystemLogsDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden: Requires Admin role' })
  async getSystemLogs(): Promise<AdminSystemLogsDto> {
    return this.adminService.getSystemLogs();
  }
}
