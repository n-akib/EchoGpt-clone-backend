import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;
  let jwtService: Partial<Record<keyof JwtService, jest.Mock>>;
  let configService: Partial<Record<keyof ConfigService, jest.Mock>>;
  let refreshTokenRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };

  const mockUser: User = {
    id: 'uuid-123',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    role: UserRole.USER,
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    isEmailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockImplementation((payload, options) => {
        return Promise.resolve(`jwt_token_${payload.sub}`);
      }),
      verifyAsync: jest.fn().mockImplementation((token, options) => {
        return Promise.resolve({
          sub: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        });
      }),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'test_access_secret';
        if (key === 'JWT_REFRESH_SECRET') return 'test_refresh_secret';
        if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return defaultValue;
      }),
    };

    refreshTokenRepository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: refreshTokenRepository,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('Password Hashing', () => {
    it('should hash a password and verify it matches', async () => {
      const password = 'SecretPassword123!';
      const hash = await authService.hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toEqual(password);

      const isValid = await authService.comparePasswords(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await authService.comparePasswords('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('register', () => {
    it('should successfully register a new user and return tokens', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);

      const registerDto = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const result = await authService.register(registerDto, {
        ip: '127.0.0.1',
        userAgent: 'Jest',
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(usersService.create).toHaveBeenCalled();
      expect(refreshTokenRepository.save).toHaveBeenCalled();
      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe(900);
    });

    it('should throw ConflictException if user email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      const registerDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should successfully log in with valid credentials and return tokens', async () => {
      const password = 'CorrectPassword123!';
      const passwordHash = await authService.hashPassword(password);
      usersService.findByEmailWithPassword.mockResolvedValue({
        ...mockUser,
        passwordHash,
      });

      const result = await authService.login(
        { email: 'test@example.com', password },
        { ip: '127.0.0.1', userAgent: 'Jest' },
      );

      expect(usersService.findByEmailWithPassword).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const passwordHash = await authService.hashPassword('CorrectPassword123!');
      usersService.findByEmailWithPassword.mockResolvedValue({
        ...mockUser,
        passwordHash,
      });

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if email does not exist', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'unknown@example.com',
          password: 'SomePassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is inactive', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'CorrectPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should rotate tokens and return new token pair for valid refresh token', async () => {
      const validSession = {
        id: 'session-123',
        userId: mockUser.id,
        tokenHash: authService.hashToken('valid_refresh_token'),
        isRevoked: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      };

      refreshTokenRepository.findOne.mockResolvedValue(validSession);
      usersService.findById.mockResolvedValue(mockUser);

      const result = await authService.refreshTokens({
        refreshToken: 'valid_refresh_token',
      });

      expect(refreshTokenRepository.findOne).toHaveBeenCalled();
      expect(validSession.isRevoked).toBe(true);
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(validSession);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException if session is already revoked', async () => {
      const revokedSession = {
        id: 'session-123',
        userId: mockUser.id,
        tokenHash: authService.hashToken('revoked_refresh_token'),
        isRevoked: true,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      };

      refreshTokenRepository.findOne.mockResolvedValue(revokedSession);

      await expect(
        authService.refreshTokens({
          refreshToken: 'revoked_refresh_token',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: mockUser.id },
        { isRevoked: true },
      );
    });

    it('should throw UnauthorizedException if session expired', async () => {
      const expiredSession = {
        id: 'session-123',
        userId: mockUser.id,
        tokenHash: authService.hashToken('expired_refresh_token'),
        isRevoked: false,
        expiresAt: new Date(Date.now() - 1000 * 60), // past
      };

      refreshTokenRepository.findOne.mockResolvedValue(expiredSession);

      await expect(
        authService.refreshTokens({
          refreshToken: 'expired_refresh_token',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke specific refresh token session when provided', async () => {
      const token = 'my_refresh_token';
      const tokenHash = authService.hashToken(token);

      const result = await authService.logout(mockUser.id, {
        refreshToken: token,
      });

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: mockUser.id, tokenHash },
        { isRevoked: true },
      );
      expect(result).toEqual({ message: 'Successfully logged out' });
    });

    it('should revoke all active sessions when no specific token is provided', async () => {
      const result = await authService.logout(mockUser.id);

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: mockUser.id, isRevoked: false },
        { isRevoked: true },
      );
      expect(result).toEqual({ message: 'Successfully logged out' });
    });
  });
});

