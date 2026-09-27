import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account with hashed password and returns an access/refresh token pair.',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input parameters' })
  @ApiConflictResponse({ description: 'Email address is already in use' })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.register(registerDto, { ip, userAgent });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log in user',
    description:
      'Authenticates user with email and password, returning a new access/refresh token pair.',
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiBadRequestResponse({ description: 'Invalid input parameters' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(loginDto, { ip, userAgent });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Validates and rotates the refresh token, invalidating the old token and returning a new pair.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens successfully refreshed',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid, expired, or revoked refresh token',
  })
  @ApiBadRequestResponse({ description: 'Invalid input parameters' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.refreshTokens(refreshTokenDto, { ip, userAgent });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Log out user',
    description:
      'Revokes active refresh token session for the currently authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Successfully logged out' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async logout(
    @CurrentUser('id') userId: string,
    @Body() refreshTokenDto?: RefreshTokenDto,
  ): Promise<{ message: string }> {
    return this.authService.logout(userId, refreshTokenDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns profile details of the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    type: UserProfileDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getProfile(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<CurrentUserPayload> {
    return user;
  }
}

