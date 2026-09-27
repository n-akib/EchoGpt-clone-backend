import { UserRole } from '../enums/user-role.enum';

export class CreateUserDto {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}
