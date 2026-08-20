import { IsString, IsNotEmpty, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportStatus } from '../../common/constants';

export class UpdateStatusDto {
  @ApiProperty({ enum: ReportStatus, description: 'New status' })
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiProperty({ example: 'Work has started on fixing this pothole', description: 'Status note (mandatory)' })
  @IsString()
  @IsNotEmpty({ message: 'Status note is required for every transition' })
  @MaxLength(1000)
  note: string;

  @ApiPropertyOptional({ description: 'After-photo URL (required when resolving)' })
  @IsOptional()
  @IsString()
  photo_url?: string;
}
