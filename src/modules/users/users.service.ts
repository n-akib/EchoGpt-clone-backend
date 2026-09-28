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
}

