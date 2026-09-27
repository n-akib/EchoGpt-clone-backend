import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  /**
   * Hashes a raw password with bcrypt using 10 salt rounds.
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compares a plaintext password against a bcrypt hash.
   */
  async comparePasswords(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /**
   * Generates a deterministic SHA-256 hash of a refresh token to store securely.
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates an access token and refresh token pair for a user and records the session.
   */
  async generateTokens(
    user: User,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const accessSecret = this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'default_access_secret_do_not_use_in_prod',
    );
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'default_refresh_secret_do_not_use_in_prod',
    );
    const accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const tokenId = crypto.randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(
        { ...payload, jti: tokenId },
        {
          secret: refreshSecret,
          expiresIn: refreshExpiresIn,
        },
      ),
    ]);

    // Parse expiration in seconds (default 15m = 900s)
    const expiresInSeconds = 15 * 60;

    // Calculate refresh token expiry date (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Save hashed refresh token session
    const tokenHash = this.hashToken(refreshToken);
    const session = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      deviceInfo: meta?.userAgent || null,
      ipAddress: meta?.ip || null,
      expiresAt,
      isRevoked: false,
    });

    await this.refreshTokenRepository.save(session);

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Map User entity to UserProfileDto (stripping sensitive properties).
   */
  mapUserToProfile(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };
  }

  /**
   * Registers a new user account.
   */
  async register(
    registerDto: RegisterDto,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<AuthResponseDto> {
    const existing = await this.usersService.findByEmail(registerDto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await this.hashPassword(registerDto.password);

    const user = await this.usersService.create({
      email: registerDto.email,
      passwordHash,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
    });

    const tokens = await this.generateTokens(user, meta);

    return {
      user: this.mapUserToProfile(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: 'Bearer',
      expiresIn: tokens.expiresIn,
    };
  }
}
