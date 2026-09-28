import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({
    example: 'SecretPassword123!',
    description: 'Current password required to confirm account deletion',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required to confirm account deletion' })
  password: string;
}
