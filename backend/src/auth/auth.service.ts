import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../schemas/user.schema';
import {
  RefreshToken,
  RefreshTokenDocument,
} from '../schemas/refresh-token.schema';
import { UserRole } from '../common/constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ── Citizen OTP Flow ──────────────────────────────────────────────

  async requestOtp(phone: string): Promise<{ message: string; dev_otp?: string }> {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Create or update user
    await this.userModel.findOneAndUpdate(
      { phone },
      {
        phone,
        otp_hash: otpHash,
        otp_expires_at: otpExpiresAt,
        $setOnInsert: {
          name: `Citizen_${phone.slice(-4)}`,
          role: UserRole.CITIZEN,
        },
      },
      { upsert: true, new: true },
    );

    // In production, send via SMS provider. For dev, log to console.
    this.logger.log(`[DEV OTP] Phone: ${phone} → OTP: ${otp}`);

    const result: { message: string; dev_otp?: string } = {
      message: 'OTP sent successfully',
    };

    if (this.configService.get('NODE_ENV') !== 'production') {
      result.dev_otp = otp;
    }

    return result;
  }

  async verifyOtp(
    phone: string,
    otp: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const user = await this.userModel.findOne({ phone });

    if (!user) {
      throw new UnauthorizedException('User not found. Request OTP first.');
    }

    if (!user.otp_hash || !user.otp_expires_at) {
      throw new BadRequestException('No OTP requested. Call /auth/citizen/otp-request first.');
    }

    if (new Date() > user.otp_expires_at) {
      throw new UnauthorizedException('OTP expired. Request a new one.');
    }

    const isValid = await bcrypt.compare(otp, user.otp_hash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Clear OTP after successful verification
    user.set('otp_hash', undefined);
    user.set('otp_expires_at', undefined);
    await user.save();

    return this.generateTokenPair(user);
  }

  // ── Staff/Admin Login ─────────────────────────────────────────────

  async staffLogin(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Account not configured for password login');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateTokenPair(user);
  }

  // ── Token Refresh ─────────────────────────────────────────────────

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify the refresh token JWT
    let payload: { sub: string; type: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Check refresh token in DB
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const storedToken = await this.refreshTokenModel.findOne({
      user_id: payload.sub,
      revoked: false,
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token revoked or not found');
    }

    // Revoke old token
    storedToken.revoked = true;
    await storedToken.save();

    // Get user and generate new pair
    const user = await this.userModel.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokens = await this.createTokens(user);
    return tokens;
  }

  // ── Logout ────────────────────────────────────────────────────────

  async logout(userId: string): Promise<{ message: string }> {
    await this.refreshTokenModel.updateMany(
      { user_id: userId, revoked: false },
      { revoked: true },
    );
    return { message: 'Logged out successfully' };
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private async generateTokenPair(user: UserDocument) {
    const tokens = await this.createTokens(user);

    return {
      ...tokens,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    };
  }

  private async createTokens(user: UserDocument) {
    const jwtPayload = { sub: user._id.toString(), role: user.role };

    const accessToken = this.jwtService.sign(jwtPayload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRY', '15m'),
    });

    const refreshToken = this.jwtService.sign(
      { ...jwtPayload, type: 'refresh' },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRY', '7d'),
      },
    );

    // Store refresh token hash in DB
    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await this.refreshTokenModel.create({
      user_id: user._id,
      token_hash: refreshHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken };
  }
}
