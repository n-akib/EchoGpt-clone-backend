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
