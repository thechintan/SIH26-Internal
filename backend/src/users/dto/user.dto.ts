import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsOptional,
  MinLength,
  IsMongoId,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/constants';

export class CreateStaffDto {
  @ApiProperty({ example: 'Rajesh Kumar' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'rajesh@civicpulse.in' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: [UserRole.STAFF, UserRole.DEPT_HEAD, UserRole.SUPER_ADMIN] })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ description: 'Department ID for staff/dept-head' })
  @IsOptional()
  @IsMongoId()
  department_id?: string;

  @ApiPropertyOptional({ description: 'Ward IDs this user has access to' })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  ward_scope?: string[];
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Updated Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'FCM push notification token' })
  @IsOptional()
  @IsString()
  fcm_token?: string;
}
