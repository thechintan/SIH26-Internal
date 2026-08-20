import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private fcmInitialized = false;
  private firebaseAdmin: any;

  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async onModuleInit() {
    const fcmPath = this.configService.get('FCM_SERVICE_ACCOUNT_PATH');
    if (fcmPath) {
      try {
        this.firebaseAdmin = await import('firebase-admin');
        const serviceAccount = require(fcmPath);
        this.firebaseAdmin.initializeApp({
          credential: this.firebaseAdmin.credential.cert(serviceAccount),
        });
        this.fcmInitialized = true;
        this.logger.log('Firebase Cloud Messaging initialized successfully');
      } catch (error) {
        this.logger.warn(`FCM initialization failed: ${error.message}. Falling back to console logging.`);
      }
    } else {
      this.logger.log('FCM_SERVICE_ACCOUNT_PATH not set. Notifications will be logged to console only.');
    }
  }

  async send(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    // Always log for audit/debugging
    this.logger.log(
      `[NOTIFICATION] To: ${userId} | ${title}: ${body}${data ? ' | Data: ' + JSON.stringify(data) : ''}`,
    );

    if (!this.fcmInitialized) {
      return; // Console-only mode
    }

    try {
      const user = await this.userModel.findById(userId).select('fcm_token').lean();
      if (!user?.fcm_token) {
        this.logger.debug(`No FCM token for user ${userId}, skipping push`);
        return;
      }

      await this.firebaseAdmin.messaging().send({
        token: user.fcm_token,
        notification: { title, body },
        data: data || {},
      });

      this.logger.debug(`Push notification sent to user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send push to ${userId}: ${error.message}`);
    }
  }

  async sendToMultiple(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    await Promise.allSettled(
      userIds.map((id) => this.send(id, title, body, data)),
    );
  }
}
