import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../../users/enums/user-role.enum';

export class AdminUpdateUserRoleDto {
  @ApiProperty({
    description: 'Updated role for the user',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}
