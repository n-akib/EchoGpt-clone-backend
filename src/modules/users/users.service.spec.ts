import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';

describe('UsersService', () => {
  let usersService: UsersService;
  let userRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  const mockUser: User = {
    id: 'user-uuid-1',
    email: 'user@example.com',
    passwordHash: 'hashed_password',
    role: UserRole.USER,
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    isEmailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    userRepository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
  });

  describe('getProfile', () => {
    it('should return the user profile when user exists and is active', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const profile = await usersService.getProfile('user-uuid-1');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
      });
      expect(profile).toEqual(mockUser);
    });

    it('should throw NotFoundException if user is not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(usersService.getProfile('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if user account is inactive', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(usersService.getProfile('user-uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update and return the updated user profile', async () => {
      const existingUser = { ...mockUser };
      userRepository.findOne.mockResolvedValue(existingUser);

      const updated = await usersService.updateProfile('user-uuid-1', {
        firstName: 'Jane',
        lastName: 'Smith',
      });

      expect(userRepository.save).toHaveBeenCalled();
      expect(updated.firstName).toBe('Jane');
      expect(updated.lastName).toBe('Smith');
    });

    it('should throw NotFoundException if trying to update non-existent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        usersService.updateProfile('non-existent', { firstName: 'Jane' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    it('should change password when current password is valid and new password is provided', async () => {
      const currentPassword = 'OldPassword123!';
      const newPassword = 'NewPassword456!';
      const passwordHash = await bcrypt.hash(currentPassword, 10);

      const qb = userRepository.createQueryBuilder();
      qb.getOne.mockResolvedValue({
        ...mockUser,
        passwordHash,
      });

      const result = await usersService.changePassword('user-uuid-1', {
        currentPassword,
        newPassword,
      });

      expect(userRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('should throw BadRequestException if current password is wrong', async () => {
      const passwordHash = await bcrypt.hash('OldPassword123!', 10);
      const qb = userRepository.createQueryBuilder();
      qb.getOne.mockResolvedValue({
        ...mockUser,
        passwordHash,
      });

      await expect(
        usersService.changePassword('user-uuid-1', {
          currentPassword: 'WrongPassword!',
          newPassword: 'NewPassword456!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if new password equals current password', async () => {
      const password = 'SamePassword123!';
      const passwordHash = await bcrypt.hash(password, 10);
      const qb = userRepository.createQueryBuilder();
      qb.getOne.mockResolvedValue({
        ...mockUser,
        passwordHash,
      });

      await expect(
        usersService.changePassword('user-uuid-1', {
          currentPassword: password,
          newPassword: password,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user is not found or inactive', async () => {
      const qb = userRepository.createQueryBuilder();
      qb.getOne.mockResolvedValue(null);

      await expect(
        usersService.changePassword('non-existent', {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword456!',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
