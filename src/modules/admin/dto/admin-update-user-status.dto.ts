import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class AdminUpdateUserStatusDto {
  @ApiProperty({
    description: 'Active status of the user account (false to ban/deactivate)',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}
