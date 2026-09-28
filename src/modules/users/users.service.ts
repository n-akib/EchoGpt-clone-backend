import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UserRole } from './enums/user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create({
      email: createUserDto.email.toLowerCase().trim(),
      passwordHash: createUserDto.passwordHash,
      firstName: createUserDto.firstName || null,
      lastName: createUserDto.lastName || null,
      role: createUserDto.role,
    });
    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash', 'passwordHash')
      .where('LOWER(user.email) = :email', { email: email.toLowerCase().trim() })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User profile not found or account is inactive');
    }
    return user;
  }

  async updateProfile(
    userId: string,
    updateData: { firstName?: string; lastName?: string },
  ): Promise<User> {
    const user = await this.getProfile(userId);
    if (updateData.firstName !== undefined) {
      user.firstName = updateData.firstName.trim() || null;
    }
    if (updateData.lastName !== undefined) {
      user.lastName = updateData.lastName.trim() || null;
    }
    return this.userRepository.save(user);
  }

  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash', 'passwordHash')
      .where('user.id = :id', { id })
      .getOne();
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.findByIdWithPassword(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User profile not found or account is inactive');
    }

    const isMatch = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (changePasswordDto.newPassword === changePasswordDto.currentPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    user.passwordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }

  async deleteAccount(
    userId: string,
    deleteAccountDto: DeleteAccountDto,
  ): Promise<{ message: string }> {
    const user = await this.findByIdWithPassword(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User not found or account is already inactive');
    }

    const isMatch = await bcrypt.compare(
      deleteAccountDto.password,
      user.passwordHash,
    );
    if (!isMatch) {
      throw new BadRequestException('Password is incorrect');
    }

    user.isActive = false;
    await this.userRepository.save(user);

    return { message: 'Account deleted successfully' };
  }

  async findAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getUsersStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    adminCount: number;
    userCount: number;
  }> {
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({ where: { isActive: true } });
    const inactiveUsers = totalUsers - activeUsers;
    const adminCount = await this.userRepository.count({ where: { role: UserRole.ADMIN } });
    const userCount = await this.userRepository.count({ where: { role: UserRole.USER } });

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      adminCount,
      userCount,
    };
  }

  async findUsersAdmin(options: {
    search?: string;
    role?: UserRole;
    isActive?: boolean;
    limit?: number;
    page?: number;
  }): Promise<{ users: User[]; total: number }> {
    const limit = Math.min(Math.max(options.limit || 20, 1), 100);
    const page = Math.max(options.page || 1, 1);
    const skip = (page - 1) * limit;

    const qb = this.userRepository.createQueryBuilder('user');

    if (options.role) {
      qb.andWhere('user.role = :role', { role: options.role });
    }

    if (options.isActive !== undefined) {
      qb.andWhere('user.is_active = :isActive', { isActive: options.isActive });
    }

    if (options.search) {
      const term = `%${options.search.toLowerCase().trim()}%`;
      qb.andWhere(
        '(LOWER(user.email) LIKE :term OR LOWER(user.first_name) LIKE :term OR LOWER(user.last_name) LIKE :term)',
        { term },
      );
    }

    qb.orderBy('user.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [users, total] = await qb.getManyAndCount();
    return { users, total };
  }

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    user.role = role;
    return this.userRepository.save(user);
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    user.isActive = isActive;
    return this.userRepository.save(user);
  }
}

