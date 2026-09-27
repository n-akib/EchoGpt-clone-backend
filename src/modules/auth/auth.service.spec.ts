import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
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
});
