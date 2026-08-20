import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get('presigned-url')
  @ApiOperation({ summary: 'Get pre-signed S3 URL for direct image upload' })
  @ApiQuery({ name: 'contentType', example: 'image/jpeg' })
  @ApiQuery({ name: 'filename', example: 'pothole-photo.jpg' })
  async getPresignedUrl(
    @Query('contentType') contentType: string,
    @Query('filename') filename: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.uploadsService.generatePresignedUrl(userId, contentType, filename);
  }
}
