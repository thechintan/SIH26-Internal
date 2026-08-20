import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private s3Client: S3Client | null = null;
  private bucket: string;
  private region: string;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY');
    this.region = this.configService.get('AWS_REGION', 'ap-south-1');
    this.bucket = this.configService.get('AWS_S3_BUCKET_NAME', 'civicpulse-uploads');

    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: this.region,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log('S3 client initialized');
    } else {
      this.logger.warn('AWS credentials not configured. Pre-signed URLs will return mock values.');
    }
  }

  async generatePresignedUrl(
    userId: string,
    contentType: string,
    filename: string,
  ): Promise<{ uploadUrl: string; fileUrl: string; key: string; mock: boolean }> {
    const key = `reports/${userId}/${uuidv4()}-${filename}`;

    if (!this.s3Client) {
      // Mock mode for development
      const mockUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
      return {
        uploadUrl: mockUrl,
        fileUrl: mockUrl,
        key,
        mock: true,
      };
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 900, // 15 minutes
    });

    const fileUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    return { uploadUrl, fileUrl, key, mock: false };
  }
}
