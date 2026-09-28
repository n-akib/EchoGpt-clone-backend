import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
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
    userRepository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
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
});
