import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { ProvidersService } from './providers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderResponseDto } from './dto/provider-response.dto';
import { HealthCheckResponseDto } from './dto/health-check-response.dto';

@ApiTags('AI Providers')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '[Admin] Register new AI provider',
    description: 'Registers a new AI provider (OpenAI, Anthropic, Gemini) and securely encrypts its API key with AES-256-GCM.',
  })
  @ApiResponse({
    status: 201,
    description: 'AI Provider created successfully',
    type: ProviderResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  async create(
    @Body() createProviderDto: CreateProviderDto,
  ): Promise<ProviderResponseDto> {
    return this.providersService.create(createProviderDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '[Admin] List all AI providers',
    description: 'Lists all configured AI providers with masked API keys and configuration status.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all AI providers',
    type: [ProviderResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  async findAll(): Promise<ProviderResponseDto[]> {
    return this.providersService.findAll();
  }

  @Get('available')
  @ApiOperation({
    summary: 'List available enabled AI providers',
    description: 'Returns all enabled AI providers and their supported models for users to choose from.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available AI providers',
    type: [ProviderResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findAvailable(): Promise<ProviderResponseDto[]> {
    return this.providersService.findAllEnabled();
  }

  @Get('default')
  @ApiOperation({
    summary: 'Get default AI provider',
    description: 'Retrieves the default configured AI provider for chat.',
  })
  @ApiResponse({
    status: 200,
    description: 'Default AI provider retrieved successfully',
    type: ProviderResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'No active AI providers configured' })
  async getDefault(): Promise<ProviderResponseDto> {
    return this.providersService.getDefault();
  }

  @Get('health/all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '[Admin] Health-check all enabled AI providers',
    description: 'Runs concurrent health-checks across all enabled providers, measuring latency and verifying API key validity.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health-check results for all providers',
    type: [HealthCheckResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  async healthCheckAll(): Promise<HealthCheckResponseDto[]> {
    return this.providersService.healthCheckAll();
  }

  @Get(':id/health')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '[Admin] Health-check specific AI provider',
    description: 'Sends a lightweight verification request using decrypted API credentials and returns connectivity status and latency.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check result',
    type: HealthCheckResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'Provider not found' })
  async healthCheck(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<HealthCheckResponseDto> {
    return this.providersService.healthCheck(id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '[Admin] Get AI provider by ID',
    description: 'Retrieves single provider configuration.',
  })
  @ApiResponse({
    status: 200,
    description: 'AI Provider retrieved successfully',
    type: ProviderResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'Provider not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProviderResponseDto> {
    return this.providersService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '[Admin] Update AI provider',
    description: 'Updates provider details, supported models, or rotates the encrypted API key.',
  })
  @ApiResponse({
    status: 200,
    description: 'AI Provider updated successfully',
    type: ProviderResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'Provider not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProviderDto: UpdateProviderDto,
  ): Promise<ProviderResponseDto> {
    return this.providersService.update(id, updateProviderDto);
  }

  @Patch(':id/toggle')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '[Admin] Enable or disable AI provider',
    description: 'Toggles active state or sets enabled boolean directly.',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider status updated successfully',
    type: ProviderResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'Provider not found' })
  async toggle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isEnabled') isEnabled?: boolean,
  ): Promise<ProviderResponseDto> {
    return this.providersService.toggleEnabled(id, isEnabled);
  }

  @Post(':id/set-default')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '[Admin] Set provider as system default',
    description: 'Marks this AI provider as the system default. Unsets previous default.',
  })
  @ApiResponse({
    status: 200,
    description: 'Default provider updated successfully',
    type: ProviderResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'Provider not found' })
  @ApiBadRequestResponse({ description: 'Cannot set disabled provider as default' })
  async setDefault(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProviderResponseDto> {
    return this.providersService.setDefault(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '[Admin] Delete AI provider',
    description: 'Permanently removes an AI provider configuration.',
  })
  @ApiResponse({
    status: 200,
    description: 'AI Provider deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'AI Provider deleted successfully' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'Provider not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.providersService.delete(id);
  }
}
